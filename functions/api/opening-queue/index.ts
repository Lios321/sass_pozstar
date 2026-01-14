import { getDb } from '@/functions/utils/db';
import { openingQueueItems } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const db = getDb(context.env);
    const items = await db
      .select()
      .from(openingQueueItems)
      .orderBy(asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt));

    const pending = items.filter((i: any) => i.status === 'PENDING');
    const idToIndex = new Map<string, number>();
    pending.forEach((item: any, idx: number) => idToIndex.set(item.id, idx));

    const computed = items.map((i: any) => ({
      ...i,
      positionIndex: i.status === 'PENDING' ? idToIndex.get(i.id) ?? 0 : i.positionIndex,
    }));

    return Response.json({ ok: true, items: computed });
  } catch (error) {
    console.error('Error fetching opening queue items:', error);
    return Response.json({ ok: false, error: 'Failed to fetch items' }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const db = getDb(context.env);

    const id = crypto.randomUUID();
    const now = new Date();
    const arrivalDate = body?.arrivalDate ? new Date(body.arrivalDate) : now;

    const [created] = await db
      .insert(openingQueueItems)
      .values({
        id,
        clientId: body?.clientId || null,
        clientName: String(body?.clientName || ''),
        contactPhone: String(body?.contactPhone || ''),
        equipmentType: String(body?.equipmentType || ''),
        equipmentDesc: body?.equipmentDesc || null,
        arrivalDate,
        notes: body?.notes || null,
        status: 'PENDING',
        positionIndex: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const after = await db.query.openingQueueItems.findMany({
      where: eq(openingQueueItems.status, 'PENDING'),
      orderBy: [asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt)],
    });

    let idx = 0;
    for (const item of after as any[]) {
      await db
        .update(openingQueueItems)
        .set({ positionIndex: idx })
        .where(eq(openingQueueItems.id, (item as any).id));
      idx++;
    }

    return Response.json({ ok: true, item: created });
  } catch (err: any) {
    console.error('Error in opening-queue POST:', err);
    return Response.json({ ok: false, error: err?.message || 'invalid_body' }, { status: 400 });
  }
};
