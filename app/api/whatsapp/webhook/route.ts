import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ServiceOrderStatus } from "@prisma/client";

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
            const client = await prisma.client.findFirst({
              where: {
                OR: [{ phone: { contains: digits } }, { phone: { contains: `55${digits}` } }],
              },
              select: { id: true, name: true },
            });
            if (!client?.id) continue;
            const os = await prisma.serviceOrder.findFirst({
              where: { clientId: client.id, status: ServiceOrderStatus.ORCAMENTAR },
              orderBy: { updatedAt: "desc" },
            });
            if (!os) continue;
            if (text.includes("aprovar")) {
              await prisma.serviceOrder.update({
                where: { id: os.id },
                data: { status: ServiceOrderStatus.APROVADO, updatedAt: new Date() },
              });
              await prisma.notification.create({
                data: {
                  title: "Orçamento aprovado",
                  message: `Cliente aprovou orçamento • OS ${os.orderNumber}`,
                  type: "SUCCESS",
                  clientId: client.id,
                  serviceOrderId: os.id,
                },
              });
            } else if (text.includes("rejeitar") || text.includes("rejeitar orçamento")) {
              await prisma.serviceOrder.update({
                where: { id: os.id },
                data: { status: ServiceOrderStatus.DEVOLVER, updatedAt: new Date() },
              });
              await prisma.notification.create({
                data: {
                  title: "Orçamento rejeitado",
                  message: `Cliente rejeitou orçamento • OS ${os.orderNumber}`,
                  type: "WARNING",
                  clientId: client.id,
                  serviceOrderId: os.id,
                },
              });
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
