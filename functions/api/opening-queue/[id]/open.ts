import { getDb } from '@/functions/utils/db';
import { openingQueueItems } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const onRequestPatch: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    await db
      .update(openingQueueItems)
      .set({ status: 'OPENED', updatedAt: new Date() })
      .where(eq(openingQueueItems.id, id));

    const pending = await db.query.openingQueueItems.findMany({
      where: eq(openingQueueItems.status, 'PENDING'),
      orderBy: [asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt)],
    });

    let idx = 0;
    for (const item of pending as any[]) {
      await db
        .update(openingQueueItems)
        .set({ positionIndex: idx })
        .where(eq(openingQueueItems.id, (item as any).id));
      idx++;
    }

    const updated = await db.query.openingQueueItems.findFirst({
      where: eq(openingQueueItems.id, id),
    });

    return Response.json({ ok: true, item: updated });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || 'open_failed' }, { status: 400 });
  }
};
