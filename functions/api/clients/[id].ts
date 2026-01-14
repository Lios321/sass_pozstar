import { getDb } from '../../utils/db';
import { getSessionUser } from '../../utils/auth';
import { clients, serviceOrders } from '@/lib/db/schema';
import { eq, and, or, ne, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const clientUpdateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional(),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').optional(),
  document: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres').optional(),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres').optional(),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres').optional(),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos').optional(),
  complement: z.string().optional(),
  country: z.string().min(2, 'País deve ter pelo menos 2 caracteres').optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  clientType: z.string().min(1, 'Tipo de Cliente é obrigatório').optional()
});

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const session = await getSessionUser(context.request, context.env);

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const id = context.params.id as string;
    const db = getDb(context.env);
    
    const [clientData] = await db.select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      address: clients.address,
      document: clients.document,
      city: clients.city,
      state: clients.state,
      zipCode: clients.zipCode,
      complement: clients.complement,
      country: clients.country,
      latitude: clients.latitude,
      longitude: clients.longitude,
      clientType: clients.clientType,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.clientId} = ${clients.id})`
    })
    .from(clients)
    .where(eq(clients.id, id));

    if (!clientData) {
      return Response.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const recentServiceOrders = await db.select()
      .from(serviceOrders)
      .where(eq(serviceOrders.clientId, id))
      .orderBy(desc(serviceOrders.createdAt))
      .limit(10);

    const client = {
      ...clientData,
      serviceOrders: recentServiceOrders,
      _count: {
        serviceOrders: Number(clientData.serviceOrdersCount)
      }
    };

    return Response.json({ client });

  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
};

export const onRequestPut: PagesFunction = async (context) => {
  try {
    const session = await getSessionUser(context.request, context.env);

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const id = context.params.id as string;
    const json = await context.request.json();
    const updateData = clientUpdateSchema.parse(json);
    const db = getDb(context.env);

    const [existingClient] = await db.select()
      .from(clients)
      .where(eq(clients.id, id));

    if (!existingClient) {
      return Response.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (updateData.email || updateData.document) {
      const conditions = [];
      if (updateData.email) conditions.push(eq(clients.email, updateData.email));
      if (updateData.document) conditions.push(eq(clients.document, updateData.document));

      if (conditions.length > 0) {
        const [conflictClient] = await db.select()
          .from(clients)
          .where(
            and(
              ne(clients.id, id),
              or(...conditions)
            )
          );

        if (conflictClient) {
          return Response.json(
            { error: 'Já existe outro cliente com este email ou documento' },
            { status: 400 }
          );
        }
      }
    }

    const [client] = await db.update(clients)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    return Response.json({
      message: 'Cliente atualizado com sucesso',
      client: client
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar cliente:', error);
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
};

export const onRequestDelete: PagesFunction = async (context) => {
  try {
    const session = await getSessionUser(context.request, context.env);

    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const id = context.params.id as string;
    const db = getDb(context.env);
    
    const [existingClient] = await db.select({
      id: clients.id,
      serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.clientId} = ${clients.id})`
    })
    .from(clients)
    .where(eq(clients.id, id));

    if (!existingClient) {
      return Response.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (Number(existingClient.serviceOrdersCount) > 0) {
      return Response.json(
        { error: 'Não é possível deletar cliente com ordens de serviço' },
        { status: 400 }
      );
    }

    await db.delete(clients)
      .where(eq(clients.id, id));

    return Response.json({
      message: 'Cliente deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
};
