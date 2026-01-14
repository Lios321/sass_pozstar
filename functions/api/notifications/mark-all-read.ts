import { getDb } from '@/functions/utils/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const markAllReadSchema = z.object({
  userId: z.string().optional(),
  clientId: z.string().optional(),
});

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const { userId, clientId } = markAllReadSchema.parse(body);

    if (!userId && !clientId) {
      return Response.json(
        { error: 'Pelo menos um filtro (userId ou clientId) deve ser especificado' },
        { status: 400 }
      );
    }

    const db = getDb(context.env);
    const conditions: any[] = [eq(notifications.isRead, false)];
    if (userId) conditions.push(eq(notifications.userId, userId));
    if (clientId) conditions.push(eq(notifications.clientId, clientId));

    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning({ id: notifications.id });

    return Response.json({
      message: 'Notificações marcadas como lidas',
      count: updated.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao marcar notificações como lidas:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

