import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = 'edge'

const ServiceOrderStatus = {
  ORCAMENTAR: "ORCAMENTAR",
  APROVADO: "APROVADO",
  DEVOLVER: "DEVOLVER",
};

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
    const body = await req.json();
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    const db = getRequestContext().env.DB;

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

            if (!os) continue;

            if (text.includes("aprovar")) {
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
            }
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
