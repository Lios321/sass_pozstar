import { getDb } from '@/functions/utils/db';
import { getSessionUser } from '@/functions/utils/auth';
import { clients } from '@/lib/db/schema';
import { eq, or, ilike, desc, count } from 'drizzle-orm';
import { z } from 'zod';

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').optional().or(z.literal('')),
  document: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres').optional().or(z.literal('')),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres').optional().or(z.literal('')),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres').optional().or(z.literal('')),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos').optional().or(z.literal('')),
  complement: z.string().optional(),
  country: z.string().min(2, 'País deve ter pelo menos 2 caracteres').optional().or(z.literal('')),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  clientType: z.string().min(1, 'Tipo de Cliente é obrigatório').default('PF')
})

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const { request, env } = context;
    const session = await getSessionUser(request, env);

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;
    const db = getDb(env);

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        ilike(clients.name, `%${search}%`),
        ilike(clients.email, `%${search}%`),
        ilike(clients.phone, `%${search}%`),
        ilike(clients.document, `%${search}%`)
      )
    }

    const [data] = await Promise.all([
      db.select().from(clients)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(clients.createdAt)),
    ]);

    const totalResult = await db.select({ count: count() })
      .from(clients)
      .where(whereClause);
      
    const total = totalResult[0]?.count || 0;

    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { request, env } = context;
    const session = await getSessionUser(request, env);

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const json = await request.json();
    const body = clientSchema.parse(json);
    
    const db = getDb(env);

    // Verificar se já existe cliente com mesmo email ou documento
    const existingClient = await db.query.clients.findFirst({
      where: or(
        body.email ? eq(clients.email, body.email) : undefined,
        body.document ? eq(clients.document, body.document) : undefined
      )
    });

    if (existingClient) {
      if (body.email && existingClient.email === body.email) {
        return Response.json(
          { error: 'Email já cadastrado' },
          { status: 400 }
        );
      }
      if (body.document && existingClient.document === body.document) {
        return Response.json(
          { error: 'Documento já cadastrado' },
          { status: 400 }
        );
      }
    }

    const [newClient] = await db.insert(clients).values({
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email || '',
      phone: body.phone,
      address: body.address || null,
      document: body.document || null,
      city: body.city || null,
      state: body.state || null,
      zipCode: body.zipCode || null,
      complement: body.complement || null,
      country: body.country || 'Brasil',
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      clientType: body.clientType || 'PF',
    }).returning();

    return Response.json(newClient);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao criar cliente:', error);
    return Response.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
