import { NextResponse } from "next/server"
import { enqueueItem, listQueue } from "@/lib/opening-queue"

export async function GET() {
  const items = await listQueue()
  return NextResponse.json({ ok: true, items })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await enqueueItem({
      clientId: body?.clientId,
      clientName: String(body?.clientName || ""),
      contactPhone: String(body?.contactPhone || ""),
      equipmentType: String(body?.equipmentType || ""),
      equipmentDesc: body?.equipmentDesc,
      notes: body?.notes,
    })
    return NextResponse.json({ ok: true, item: created })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid_body" }, { status: 400 })
  }
}
