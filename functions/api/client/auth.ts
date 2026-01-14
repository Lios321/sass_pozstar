import { getDb } from '@/functions/utils/db';
import { clients } from '@/lib/db/schema';
import { like, desc, and, eq } from 'drizzle-orm';
import { z } from 'zod';

const clientAuthSchema = z.object({
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
});

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const { email, phone } = clientAuthSchema.parse(body);
    const db = getDb(context.env);

    const normalizedPhone = phone.replace(/\D/g, '');

    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.email, email.toLowerCase()),
        like(clients.phone, `%${normalizedPhone.slice(-8)}`)
      ),
      with: {
        serviceOrders: {
          orderBy: (serviceOrders, { desc }) => [desc(serviceOrders.createdAt)],
        },
      },
    });

    if (!client) {
      return Response.json(
        { error: 'Cliente não encontrado. Verifique seu email e telefone.' },
        { status: 404 }
      );
    }

    const clientData = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      serviceOrdersCount: client.serviceOrders.length,
    };

    return Response.json({
      message: 'Autenticação realizada com sucesso',
      client: clientData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro na autenticação do cliente:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

