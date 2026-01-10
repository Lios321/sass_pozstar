import { NextResponse } from "next/server"
import { sendTemplate } from "@/lib/whatsapp"
import { buildTemplatePayload } from "@/lib/whatsapp-templates"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { EmailService } from "@/lib/email-service"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const to = String(body?.to || "")
    const key = String(body?.key || "")
    const params = (body?.params && typeof body.params === "object") ? body.params : {}
    const emailInput = body?.email ? String(body.email) : ""
    if (!to) {
      return NextResponse.json({ ok: false, error: "missing_to" }, { status: 400 })
    }
    if (!key) {
      return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 })
    }
    const payload = buildTemplatePayload(key, params)
    if (!payload) {
      return NextResponse.json({ ok: false, error: "unknown_template" }, { status: 404 })
    }
    return NextResponse.json({ ok: false, error: "whatsapp_disabled" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid_body" }, { status: 400 })
  }
}
