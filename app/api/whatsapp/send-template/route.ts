import { NextResponse } from "next/server";

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
