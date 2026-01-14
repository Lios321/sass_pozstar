import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"

export const runtime = 'edge'

export const runtime = 'edge';

export async function GET() {
  const db = getRequestContext().env.DB
  const { results } = await db.prepare(`
    SELECT * FROM opening_queue_items 
    ORDER BY arrivalDate ASC, createdAt ASC
  `).all()
  
  const items = results as any[]
  const pending = items.filter((i) => i.status === "PENDING")
  
  const idToIndex = new Map<string, number>()
  pending.forEach((item, idx) => idToIndex.set(item.id, idx))
  
  const computed = items.map((i) => ({
    ...i,
    positionIndex: i.status === "PENDING" ? (idToIndex.get(i.id) ?? 0) : i.positionIndex,
  }))

  return NextResponse.json({ ok: true, items: computed })
}

export async function POST(req: Request) {
  try {
<<<<<<< Updated upstream
    const body = await req.json()
    const db = getRequestContext().env.DB
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const arrivalDate = body?.arrivalDate ? new Date(body.arrivalDate).toISOString() : now

    const data = {
      id,
      clientId: body?.clientId || null,
=======
    const body = await req.json() as any
    const created = await enqueueItem({
      clientId: body?.clientId,
>>>>>>> Stashed changes
      clientName: String(body?.clientName || ""),
      contactPhone: String(body?.contactPhone || ""),
      equipmentType: String(body?.equipmentType || ""),
      equipmentDesc: body?.equipmentDesc || null,
      arrivalDate,
      notes: body?.notes || null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      positionIndex: 0 
    }

    await db.prepare(`
      INSERT INTO opening_queue_items (id, clientId, clientName, contactPhone, equipmentType, equipmentDesc, arrivalDate, notes, status, createdAt, updatedAt, positionIndex)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id, data.clientId, data.clientName, data.contactPhone, data.equipmentType, data.equipmentDesc, data.arrivalDate, data.notes, data.status, data.createdAt, data.updatedAt, data.positionIndex
    ).run()

    // Recalc positions
    const { results: pendingItems } = await db.prepare(`
      SELECT id FROM opening_queue_items 
      WHERE status = 'PENDING' 
      ORDER BY arrivalDate ASC, createdAt ASC
    `).all()
    
    const stmt = db.prepare('UPDATE opening_queue_items SET positionIndex = ? WHERE id = ?')
    const batch = []
    let idx = 0
    for (const item of pendingItems as any[]) {
      batch.push(stmt.bind(idx, item.id))
      idx++
    }
    if (batch.length > 0) await db.batch(batch)

    const created: any = await db.prepare('SELECT * FROM opening_queue_items WHERE id = ?').bind(id).first()

    return NextResponse.json({ ok: true, item: created })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "invalid_body" }, { status: 400 })
  }
}
