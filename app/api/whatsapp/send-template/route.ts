import { NextResponse } from "next/server";
<<<<<<< Updated upstream

export const runtime = 'edge'
=======
import { sendTemplate } from "@/lib/whatsapp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { EmailService } from "@/lib/email-service";
>>>>>>> Stashed changes

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body: any = await req.json();
    const to = String(body?.to || "");
    
    if (!to) {
      return NextResponse.json({ ok: false, error: "missing_to" }, { status: 400 });
    }
    // DESABILITADO TEMPORARIAMENTE: não enviar WhatsApp/Email por este endpoint
    return NextResponse.json({ ok: false, error: "whatsapp_disabled" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid_body" }, { status: 400 });
  }
}
