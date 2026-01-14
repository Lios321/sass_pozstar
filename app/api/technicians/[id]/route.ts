import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
<<<<<<< Updated upstream
=======
import { getDb } from '@/lib/db/drizzle'
import { technicians, serviceOrders } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
>>>>>>> Stashed changes
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export const runtime = 'edge';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  isAvailable: z.boolean().optional(),
  specializations: z
    .union([
      z.array(z.string()),
      z.string(),
    ])
    .optional(),
})

function normalizeSpecializations(input: string | string[] | undefined): string[] | undefined {
  if (input === undefined) return undefined
  if (Array.isArray(input)) return input
  const s = String(input)
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? parsed.map(String) : undefined
  } catch {}
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 })
    }
    
    const db = getRequestContext().env.DB
    const { id } = await params

    const data: any = {}
    if (parsed.data.name) data.name = parsed.data.name
    if (parsed.data.email) data.email = parsed.data.email
    if (parsed.data.phone) data.phone = parsed.data.phone
    if (typeof parsed.data.isAvailable === 'boolean') data.isAvailable = parsed.data.isAvailable ? 1 : 0
    
    const specs = normalizeSpecializations(parsed.data.specializations)
    if (specs !== undefined) data.specializations = JSON.stringify(specs)

<<<<<<< Updated upstream
    // Construct Update Query
    const keys = Object.keys(data)
    if (keys.length > 0) {
        const setClause = keys.map(key => `${key} = ?`).join(', ')
        const values = Object.values(data)
        // Add updatedAt
        const finalSetClause = setClause + ', updatedAt = ?'
        const finalValues = [...values, new Date().toISOString(), id]
        
        await db.prepare(`UPDATE technicians SET ${finalSetClause} WHERE id = ?`)
            .bind(...finalValues)
            .run()
    }

    const tech: any = await db.prepare('SELECT * FROM technicians WHERE id = ?').bind(id).first()
    
=======
    // Add updatedAt
    data.updatedAt = new Date()

    const { id } = await params
    const db = await getDb()

    const [tech] = await db.update(technicians)
      .set(data)
      .where(eq(technicians.id, id))
      .returning({
        id: technicians.id,
        name: technicians.name,
        email: technicians.email,
        phone: technicians.phone,
        isAvailable: technicians.isAvailable,
        specializations: technicians.specializations,
        createdAt: technicians.createdAt,
      })

>>>>>>> Stashed changes
    if (!tech) {
        return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      technician: {
        ...tech,
        isAvailable: !!tech.isAvailable,
        specializations: tech.specializations ? JSON.parse(tech.specializations) : [],
      },
    })
  } catch (e) {
    console.error('Erro ao atualizar técnico:', e)
    return NextResponse.json({ error: 'Erro ao atualizar técnico' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB

    const existing: any = await db.prepare(
        `SELECT id, (SELECT COUNT(*) FROM service_orders WHERE technicianId = technicians.id) as serviceOrdersCount FROM technicians WHERE id = ?`
    ).bind(id).first()
=======
    const db = await getDb()

    const [existing] = await db.select({
      id: technicians.id,
      serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.technicianId} = ${technicians.id})`
    })
    .from(technicians)
    .where(eq(technicians.id, id))
>>>>>>> Stashed changes

    if (!existing) {
      return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 })
    }
<<<<<<< Updated upstream
    if (existing.serviceOrdersCount > 0) {
=======
    if (Number(existing.serviceOrdersCount) > 0) {
>>>>>>> Stashed changes
      return NextResponse.json(
        { error: 'Não é possível deletar técnico com ordens de serviço vinculadas' },
        { status: 400 }
      )
    }

<<<<<<< Updated upstream
    await db.prepare('DELETE FROM technicians WHERE id = ?').bind(id).run()
=======
    await db.delete(technicians).where(eq(technicians.id, id))
>>>>>>> Stashed changes
    return NextResponse.json({ message: 'Técnico removido com sucesso' })
  } catch (e) {
    console.error('Erro ao remover técnico:', e)
    return NextResponse.json({ error: 'Erro ao remover técnico' }, { status: 500 })
  }
}
