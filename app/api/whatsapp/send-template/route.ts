import { NextResponse } from "next/server";
import { sendTemplate } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { EmailService } from "@/lib/email-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to = String(body?.to || "");
    const name = String(body?.name || "confirmacao_servico");
    const language = String(body?.language || "pt_BR");
    const components = Array.isArray(body?.components)
      ? body.components
      : [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(body?.nome || "Cliente") },
            ],
          },
        ];
    const emailInput = body?.email ? String(body.email) : "";
    if (!to) {
      return NextResponse.json({ ok: false, error: "missing_to" }, { status: 400 });
    }
    // DESABILITADO TEMPORARIAMENTE: não enviar WhatsApp/Email por este endpoint
    return NextResponse.json({ ok: false, error: "whatsapp_disabled" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid_body" }, { status: 400 });
  }
}
