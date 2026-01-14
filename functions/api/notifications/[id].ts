import { getDb } from '@/functions/utils/db';
import { notifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'STATUS_UPDATE']).optional(),
});

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, id),
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

    if (!notification) {
      return Response.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    return Response.json({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      userId: notification.userId,
      clientId: notification.clientId,
      serviceOrderId: notification.serviceOrderId,
      user: notification.user,
      client: notification.client,
      serviceOrder: notification.serviceOrder,
    });
  } catch (error) {
    console.error('Erro ao buscar notificação:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const body: any = await context.request.json();
    const data = updateNotificationSchema.parse(body);
    const db = getDb(context.env);

    const [existingNotification] = await db.select().from(notifications).where(eq(notifications.id, id));

    if (!existingNotification) {
      return Response.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    const [updatedNotification] = await db
      .update(notifications)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    const notificationWithRelations = await db.query.notifications.findFirst({
      where: eq(notifications.id, updatedNotification.id),
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

    return Response.json(notificationWithRelations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao atualizar notificação:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    const [existingNotification] = await db.select().from(notifications).where(eq(notifications.id, id));

    if (!existingNotification) {
      return Response.json({ error: 'Notificação não encontrada' }, { status: 404 });
    }

    await db.delete(notifications).where(eq(notifications.id, id));
    return Response.json({ message: 'Notificação deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

