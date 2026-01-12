import { NextResponse } from "next/server"
import { openItem } from "@/lib/opening-queue"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function PATCH(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await ctx.params
    const updated = await openItem(id)
    return NextResponse.json({ ok: true, item: updated })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "open_failed" }, { status: 400 })
  }
}
