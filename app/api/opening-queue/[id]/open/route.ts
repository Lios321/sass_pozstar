import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"

export const runtime = 'edge'

export const runtime = 'edge';

export async function PATCH(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const db = getRequestContext().env.DB

    await db.prepare("UPDATE opening_queue_items SET status = 'OPENED' WHERE id = ?").bind(id).run()

    // Recalc positions
    const { results: after } = await db.prepare(`
      SELECT id FROM opening_queue_items 
      WHERE status = 'PENDING' 
      ORDER BY arrivalDate ASC, createdAt ASC
    `).all()

    const stmt = db.prepare('UPDATE opening_queue_items SET positionIndex = ? WHERE id = ?')
    const batch = []
    let idx = 0
    for (const item of after as any[]) {
      batch.push(stmt.bind(idx, item.id))
      idx++
    }
    if (batch.length > 0) await db.batch(batch)

    const updated: any = await db.prepare('SELECT * FROM opening_queue_items WHERE id = ?').bind(id).first()
    return NextResponse.json({ ok: true, item: updated })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "open_failed" }, { status: 400 })
  }
}
