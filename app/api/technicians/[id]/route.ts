import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 })
    }
    const data: any = {}
    if (parsed.data.name) data.name = parsed.data.name
    if (parsed.data.email) data.email = parsed.data.email
    if (parsed.data.phone) data.phone = parsed.data.phone
    if (typeof parsed.data.isAvailable === 'boolean') data.isAvailable = parsed.data.isAvailable
    const specs = normalizeSpecializations(parsed.data.specializations)
    if (specs !== undefined) data.specializations = JSON.stringify(specs)

    const { id } = await params
    const tech = await prisma.technician.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAvailable: true,
        specializations: true,
        createdAt: true,
      },
    })
    return NextResponse.json({
      technician: {
        ...tech,
        specializations: tech.specializations ? JSON.parse(tech.specializations) : [],
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar técnico' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.technician.findUnique({
      where: { id },
      include: { _count: { select: { serviceOrders: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 })
    }
    if (existing._count.serviceOrders > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar técnico com ordens de serviço vinculadas' },
        { status: 400 }
      )
    }

    await prisma.technician.delete({ where: { id } })
    return NextResponse.json({ message: 'Técnico removido com sucesso' })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao remover técnico' }, { status: 500 })
  }
}

