import { NextResponse } from "next/server"
import { openItem } from "@/lib/opening-queue"

export async function PATCH(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const updated = await openItem(id)
    return NextResponse.json({ ok: true, item: updated })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "open_failed" }, { status: 400 })
  }
}
