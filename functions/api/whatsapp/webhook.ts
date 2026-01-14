import { getDb } from '@/functions/utils/db';
import { serviceOrders, clients, notifications } from '@/lib/db/schema';
import { eq, or, like, desc, and } from 'drizzle-orm';
import { ServiceOrderStatusValues } from '@/lib/types';

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = String((context.env as any).WHATSAPP_VERIFY_TOKEN || '');

  if (mode === 'subscribe' && token && challenge && token === expected) {
    return new Response(challenge, { status: 200 });
  }
  return Response.json({ ok: false }, { status: 403 });
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    const db = getDb(context.env);

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value || {};
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const msg of messages) {
          const from = String(msg?.from || '');
          const type = String(msg?.type || '');
          if (type !== 'button') continue;

          const text = String(msg?.button?.text || '').toLowerCase();
          const digits = from.replace(/[^\d]/g, '');

          const client = await db.query.clients.findFirst({
            where: or(like(clients.phone, `%${digits}%`), like(clients.phone, `%55${digits}%`)),
            columns: { id: true, name: true },
          });

          if (!client?.id) continue;

          const os = await db.query.serviceOrders.findFirst({
            where: and(
              eq(serviceOrders.clientId, client.id),
              eq(serviceOrders.status, ServiceOrderStatusValues.ORCAMENTAR)
            ),
            orderBy: [desc(serviceOrders.updatedAt)],
          });

          if (!os) continue;

          if (text.includes('aprovar')) {
            await db
              .update(serviceOrders)
              .set({ status: ServiceOrderStatusValues.APROVADO, updatedAt: new Date() })
              .where(eq(serviceOrders.id, os.id));

            await db.insert(notifications).values({
              id: crypto.randomUUID(),
              title: 'Orçamento aprovado',
              message: `Cliente aprovou orçamento • OS ${os.orderNumber}`,
              type: 'SUCCESS',
              clientId: client.id,
              serviceOrderId: os.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (text.includes('rejeitar') || text.includes('rejeitar orçamento')) {
            await db
              .update(serviceOrders)
              .set({ status: ServiceOrderStatusValues.DEVOLVER, updatedAt: new Date() })
              .where(eq(serviceOrders.id, os.id));

            await db.insert(notifications).values({
              id: crypto.randomUUID(),
              title: 'Orçamento rejeitado',
              message: `Cliente rejeitou orçamento • OS ${os.orderNumber}`,
              type: 'WARNING',
              clientId: client.id,
              serviceOrderId: os.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ ok: false }, { status: 400 });
  }
};

