import { getDb } from '@/functions/utils/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

const createNotificationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'STATUS_UPDATE']).default('INFO'),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  serviceOrderId: z.string().optional(),
});

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const userId = url.searchParams.get('userId');
    const clientId = url.searchParams.get('clientId');
    const isRead = url.searchParams.get('isRead');
    const type = url.searchParams.get('type');

    const skip = (page - 1) * limit;
    const db = getDb(context.env);

    const conditions: any[] = [];
    if (userId) conditions.push(eq(notifications.userId, userId));
    if (clientId) conditions.push(eq(notifications.clientId, clientId));
    if (isRead !== null) conditions.push(eq(notifications.isRead, isRead === 'true'));
    if (type && ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'STATUS_UPDATE'].includes(type)) {
      conditions.push(eq(notifications.type, type as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const notificationsData = await db.query.notifications.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        serviceOrder: {
          columns: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset: skip,
    });

    const totalResult = await db.select({ count: count() }).from(notifications).where(whereClause);
    const total = totalResult[0]?.count || 0;

    return Response.json({
      notifications: notificationsData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const data = createNotificationSchema.parse(body);

    if (!data.userId && !data.clientId) {
      return Response.json(
        { error: 'Destinatário obrigatório (userId ou clientId)' },
        { status: 400 }
      );
    }

    const db = getDb(context.env);

    const [notification] = await db
      .insert(notifications)
      .values({
        id: crypto.randomUUID(),
        ...data,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const notificationWithRelations = await db.query.notifications.findFirst({
      where: eq(notifications.id, notification.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        serviceOrder: {
          columns: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    return Response.json(notificationWithRelations, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao criar notificação:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

