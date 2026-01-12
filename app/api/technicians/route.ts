import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { hashPassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { EmailService } from '@/lib/email-service'
import { inviteTemplate } from '@/lib/email-templates'

// Interfaces para tipos de dados
interface TechnicianFromDB {
  id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  isAvailable: z.boolean().optional(),
  specializations: z
    .union([z.array(z.string()), z.string()])
    .optional(),
})

function normalizeSpecializations(input: string | string[] | undefined): string[] {
  if (input === undefined) return []
  if (Array.isArray(input)) return input.map(String)
  const s = String(input)
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {}
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

// GET - Listar técnicos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const available = searchParams.get('available')

    const skip = (page - 1) * limit

    const where: Prisma.TechnicianWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ]
    }

    if (available !== null && available !== undefined) {
      where.isAvailable = available === 'true'
    }

    const [technicians, total] = await Promise.all([
      prisma.technician.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { serviceOrders: true }
          }
        }
      }),
      prisma.technician.count({ where })
    ])

    // Parse specializations JSON
    const techniciansParsed = technicians.map((tech: TechnicianFromDB) => ({
      ...tech,
      specializations: tech.specializations ? JSON.parse(tech.specializations) : []
    }))

    return NextResponse.json({
      technicians: techniciansParsed,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar técnicos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar técnico
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }
    const { name, email, phone } = parsed.data
    const specializations = normalizeSpecializations(parsed.data.specializations)
    const isAvailable =
      typeof parsed.data.isAvailable === 'boolean' ? parsed.data.isAvailable : true

    // Verificar se técnico já existe
    const existingTechnician = await prisma.technician.findUnique({
      where: { email }
    })

    if (existingTechnician) {
      return NextResponse.json(
        { error: 'Técnico já existe com este email' },
        { status: 400 }
      )
    }

    const technician = await prisma.technician.create({
      data: {
        name,
        email,
        phone,
        isAvailable,
        specializations: JSON.stringify(specializations)
      }
    })

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser) {
      const tempPassword = Math.random().toString(36).slice(-12)
      const hashed = await hashPassword(tempPassword)
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashed,
          role: 'TECHNICIAN'
        }
      })
    }

    let inviteLink: string | null = null
    let emailPreview: string | null = null
    try {
      const origin = (() => {
        try {
          return new URL(request.url).origin
        } catch {
          return null
        }
      })()
      const baseCandidate = process.env.SITE_URL || origin || process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const base = (() => {
        const withScheme = /^https?:\/\//.test(baseCandidate) ? baseCandidate : `http://${baseCandidate}`
        try {
          const u = new URL(withScheme)
          if (['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname)) {
            u.protocol = 'http:'
          }
          return `${u.protocol}//${u.host}`
        } catch {
          return withScheme
        }
      })()
      const secret = process.env.JWT_SECRET || ''
      if (secret) {
        const token = jwt.sign(
          { email, purpose: 'set_password' },
          secret,
          { expiresIn: '48h' }
        )
        inviteLink = `${base}/auth/definir-senha?token=${encodeURIComponent(token)}`
        const html = inviteTemplate(name, { label: 'Definir senha', url: inviteLink })
        const result = await EmailService.sendEmail({
          to: email,
          subject: 'Seu acesso ao Pozstar - Defina sua senha',
          html
        })
        if (result.previewUrl) {
          emailPreview = result.previewUrl
        }
      }
    } catch {}

    return NextResponse.json(
      {
        message: 'Técnico criado com sucesso',
        technician: {
          ...technician,
          specializations
        },
        inviteLink,
        emailPreview
      },
      { status: 201 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar técnico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
