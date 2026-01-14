import { NextRequest, NextResponse } from "next/server";
<<<<<<< Updated upstream
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = 'edge'

const ServiceOrderStatus = {
  ORCAMENTAR: "ORCAMENTAR",
  APROVADO: "APROVADO",
  DEVOLVER: "DEVOLVER",
};
=======
import { getDb } from "@/lib/db/drizzle";
import { serviceOrders, clients, notifications } from "@/lib/db/schema";
import { eq, or, like, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

const ServiceOrderStatus = {
  SEM_VER: 'SEM_VER',
  ORCAMENTAR: 'ORCAMENTAR',
  APROVADO: 'APROVADO',
  MELHORAR: 'MELHORAR',
  DEVOLVIDO: 'DEVOLVIDO',
  DESCARTE: 'DESCARTE',
  TERMINADO: 'TERMINADO',
  ESPERANDO_PECAS: 'ESPERANDO_PECAS',
  COMPRADO: 'COMPRADO',
  ESPERANDO_CLIENTE: 'ESPERANDO_CLIENTE'
} as const;
>>>>>>> Stashed changes

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (mode === "subscribe" && token && challenge && token === expected) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const entries = Array.isArray(body?.entry) ? body.entry : [];
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB;
=======
    const db = await getDb();
>>>>>>> Stashed changes

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value || {};
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const msg of messages) {
          const from = String(msg?.from || "");
          const type = String(msg?.type || "");
          if (type === "button") {
            const text = String(msg?.button?.text || "").toLowerCase();
            const digits = from.replace(/[^\d]/g, "");
            
<<<<<<< Updated upstream
            const client: any = await db.prepare(`
              SELECT id, name FROM clients 
              WHERE phone LIKE ? OR phone LIKE ?
              LIMIT 1
            `).bind(`%${digits}%`, `%55${digits}%`).first();

            if (!client?.id) continue;

            const os: any = await db.prepare(`
              SELECT * FROM service_orders 
              WHERE clientId = ? AND status = ?
              ORDER BY updatedAt DESC 
              LIMIT 1
            `).bind(client.id, ServiceOrderStatus.ORCAMENTAR).first();
=======
            // Drizzle 'like' search for phone number
            const client = await db.query.clients.findFirst({
              where: or(
                like(clients.phone, `%${digits}%`),
                like(clients.phone, `%55${digits}%`)
              ),
              columns: { id: true, name: true },
            });

            if (!client?.id) continue;

            const os = await db.query.serviceOrders.findFirst({
              where: and(
                eq(serviceOrders.clientId, client.id),
                eq(serviceOrders.status, ServiceOrderStatus.ORCAMENTAR)
              ),
              orderBy: [desc(serviceOrders.updatedAt)],
            });
>>>>>>> Stashed changes

            if (!os) continue;

            if (text.includes("aprovar")) {
<<<<<<< Updated upstream
              await db.prepare(`
                UPDATE service_orders 
                SET status = ?, updatedAt = ? 
                WHERE id = ?
              `).bind(ServiceOrderStatus.APROVADO, new Date().toISOString(), os.id).run();

              await db.prepare(`
                INSERT INTO notifications (id, title, message, type, clientId, serviceOrderId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                crypto.randomUUID(),
                "Orçamento aprovado",
                `Cliente aprovou orçamento • OS ${os.orderNumber}`,
                "SUCCESS",
                client.id,
                os.id,
                new Date().toISOString(),
                new Date().toISOString()
              ).run();

            } else if (text.includes("rejeitar") || text.includes("rejeitar orçamento")) {
              await db.prepare(`
                UPDATE service_orders 
                SET status = ?, updatedAt = ? 
                WHERE id = ?
              `).bind(ServiceOrderStatus.DEVOLVER, new Date().toISOString(), os.id).run();

              await db.prepare(`
                INSERT INTO notifications (id, title, message, type, clientId, serviceOrderId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                crypto.randomUUID(),
                "Orçamento rejeitado",
                `Cliente rejeitou orçamento • OS ${os.orderNumber}`,
                "WARNING",
                client.id,
                os.id,
                new Date().toISOString(),
                new Date().toISOString()
              ).run();
=======
              await db.update(serviceOrders).set({
                status: ServiceOrderStatus.APROVADO,
                updatedAt: new Date()
              }).where(eq(serviceOrders.id, os.id));

              await db.insert(notifications).values({
                id: uuidv4(),
                title: "Orçamento aprovado",
                message: `Cliente aprovou orçamento • OS ${os.orderNumber}`,
                type: "SUCCESS",
                clientId: client.id,
                serviceOrderId: os.id,
                createdAt: new Date(),
                updatedAt: new Date()
              });

            } else if (text.includes("rejeitar") || text.includes("rejeitar orçamento")) {
              await db.update(serviceOrders).set({
                status: ServiceOrderStatus.DEVOLVIDO, // Was DEVOLVER in original, assuming DEVOLVIDO or need to check
                updatedAt: new Date()
              }).where(eq(serviceOrders.id, os.id));

              await db.insert(notifications).values({
                id: uuidv4(),
                title: "Orçamento rejeitado",
                message: `Cliente rejeitou orçamento • OS ${os.orderNumber}`,
                type: "WARNING",
                clientId: client.id,
                serviceOrderId: os.id,
                createdAt: new Date(),
                updatedAt: new Date()
              });
>>>>>>> Stashed changes
            }
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
