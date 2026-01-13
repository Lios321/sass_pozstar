import { NextResponse } from "next/server"
import { listTemplates } from "@/lib/whatsapp-templates"

export const runtime = 'edge'

export async function GET() {
  const items = listTemplates()
  return NextResponse.json({ ok: true, items })
}

