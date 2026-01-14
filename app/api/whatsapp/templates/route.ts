import { NextResponse } from "next/server"
import { listTemplates } from "@/lib/whatsapp-templates"

<<<<<<< Updated upstream
export const runtime = 'edge'
=======
export const runtime = 'edge';
>>>>>>> Stashed changes

export async function GET() {
  const items = listTemplates()
  return NextResponse.json({ ok: true, items })
}

