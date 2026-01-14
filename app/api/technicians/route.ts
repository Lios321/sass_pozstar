import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
=======
import { getDb } from '@/lib/db/drizzle'
import { technicians, users, serviceOrders } from '@/lib/db/schema'
import { eq, or, and, desc, count, sql, like } from 'drizzle-orm'
>>>>>>> Stashed changes
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { EmailService } from '@/lib/email-service'
import { inviteTemplate } from '@/lib/email-templates'
<<<<<<< Updated upstream
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
=======
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge';

// Interfaces para tipos de dados
// Removido TechnicianWhereClause customizado; vamos usar o tipo oficial do Prisma

interface TechnicianFromDB {
  id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string | null;
  isAvailable: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  serviceOrdersCount?: number;
}
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
    const offset = (page - 1) * limit
    const db = getRequestContext().env.DB

    let whereClauses: string[] = []
    let params: any[] = []

    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)')
      const s = `%${search}%`
      params.push(s, s, s)
    }

    if (available !== null && available !== undefined) {
      whereClauses.push('isAvailable = ?')
      params.push(available === 'true' ? 1 : 0) // SQLite uses 1/0 for boolean
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

    const countQuery = `SELECT COUNT(*) as count FROM technicians ${whereSQL}`
    const totalResult: any = await db.prepare(countQuery).bind(...params).first()
    const total = totalResult?.count || 0

    const query = `
      SELECT *, (SELECT COUNT(*) FROM service_orders WHERE technicianId = technicians.id) as serviceOrdersCount 
      FROM technicians 
      ${whereSQL} 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `
    const { results: technicians } = await db.prepare(query).bind(...params, limit, offset).all()
=======
    const skip = (page - 1) * limit
    const db = await getDb()

    const conditions = []

    if (search) {
      conditions.push(
        or(
          like(technicians.name, `%${search}%`),
          like(technicians.email, `%${search}%`),
          like(technicians.phone, `%${search}%`)
        )
      )
    }

    if (available !== null && available !== undefined) {
      conditions.push(eq(technicians.isAvailable, available === 'true'))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [techniciansData, totalResult] = await Promise.all([
      db.select({
        id: technicians.id,
        name: technicians.name,
        email: technicians.email,
        phone: technicians.phone,
        specializations: technicians.specializations,
        isAvailable: technicians.isAvailable,
        createdAt: technicians.createdAt,
        updatedAt: technicians.updatedAt,
        serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.technicianId} = ${technicians.id})`
      })
      .from(technicians)
      .where(whereClause)
      .limit(limit)
      .offset(skip)
      .orderBy(desc(technicians.createdAt)),
      db.select({ count: count() }).from(technicians).where(whereClause)
    ])
>>>>>>> Stashed changes

    const total = totalResult[0]?.count || 0

    // Parse specializations JSON
<<<<<<< Updated upstream
    const techniciansParsed = technicians.map((tech: any) => ({
=======
    const techniciansParsed = techniciansData.map((tech) => ({
>>>>>>> Stashed changes
      ...tech,
      isAvailable: !!tech.isAvailable, // Convert 1/0 to boolean
      specializations: tech.specializations ? JSON.parse(tech.specializations) : [],
      _count: {
        serviceOrders: tech.serviceOrdersCount
      }
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
    if (!session || (session.user as any)?.role !== 'ADMIN') {
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

<<<<<<< Updated upstream
    const db = getRequestContext().env.DB

    // Verificar se técnico já existe
    const existingTechnician = await db.prepare('SELECT id FROM technicians WHERE email = ?').bind(email).first()
=======
    const db = await getDb()

    // Verificar se técnico já existe
    const [existingTechnician] = await db.select()
      .from(technicians)
      .where(eq(technicians.email, email))
>>>>>>> Stashed changes

    if (existingTechnician) {
      return NextResponse.json(
        { error: 'Técnico já existe com este email' },
        { status: 400 }
      )
    }

<<<<<<< Updated upstream
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const specsJson = JSON.stringify(specializations)

    await db.prepare(`
        INSERT INTO technicians (id, name, email, phone, isAvailable, specializations, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, email, phone, isAvailable ? 1 : 0, specsJson, now, now).run()
    
    // Fetch created technician
    const technician: any = await db.prepare('SELECT * FROM technicians WHERE id = ?').bind(id).first()

    // Create User account if not exists
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (!existingUser) {
      const tempPassword = Math.random().toString(36).slice(-12)
      const hashed = await hashPassword(tempPassword)
      const userId = crypto.randomUUID()
      
      await db.prepare(`
        INSERT INTO users (id, name, email, password, role, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, name, email, hashed, 'TECHNICIAN', now, now).run()
=======
    const technicianId = uuidv4()
    const [technician] = await db.insert(technicians)
      .values({
        id: technicianId,
        name,
        email,
        phone,
        isAvailable,
        specializations: JSON.stringify(specializations),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.email, email))

    if (!existingUser) {
      const tempPassword = Math.random().toString(36).slice(-12)
      const hashed = await hashPassword(tempPassword)
      await db.insert(users).values({
        id: uuidv4(),
        name,
        email,
        password: hashed,
        role: 'TECHNICIAN',
        createdAt: new Date(),
        updatedAt: new Date()
      })
>>>>>>> Stashed changes
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
    } catch (e) {
        console.error("Email error", e)
    }

    return NextResponse.json(
      {
        message: 'Técnico criado com sucesso',
        technician: {
          ...technician,
          isAvailable: !!technician.isAvailable,
          specializations: JSON.parse(technician.specializations || '[]')
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
