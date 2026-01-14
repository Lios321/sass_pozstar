import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
=======
import { getDb } from '@/lib/db/drizzle'
import { clients, serviceOrders } from '@/lib/db/schema'
import { like, or, desc, count, eq, sql, getTableColumns } from 'drizzle-orm'
import { getUserFromToken, getTokenFromRequest } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { sendTemplate } from '@/lib/whatsapp'
import { buildTemplatePayload } from '@/lib/whatsapp-templates'
import { EmailService } from '@/lib/email-service'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge';
>>>>>>> Stashed changes

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  document: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres'),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos'),
  complement: z.string().optional(),
  country: z.string().min(2, 'País deve ter pelo menos 2 caracteres'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  clientType: z.string().min(1, 'Tipo de Cliente é obrigatório')
})

// GET - Listar clientes
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

    const offset = (page - 1) * limit
    const db = getRequestContext().env.DB

<<<<<<< Updated upstream
    let whereClause = ''
    let params: any[] = []

    if (search) {
      whereClause = 'WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR document LIKE ?'
      const s = `%${search}%`
      params = [s, s, s, s]
    }

    const countQuery = `SELECT COUNT(*) as count FROM clients ${whereClause}`
    const totalResult: any = await db.prepare(countQuery).bind(...params).first()
    const total = totalResult?.count || 0

    const query = `
      SELECT c.*, (SELECT COUNT(*) FROM service_orders WHERE clientId = c.id) as serviceOrdersCount 
      FROM clients c 
      ${whereClause} 
      ORDER BY c.createdAt DESC 
      LIMIT ? OFFSET ?
    `
    const { results } = await db.prepare(query).bind(...params, limit, offset).all()

    const clients = results.map((c: any) => ({
      ...c,
      _count: { serviceOrders: c.serviceOrdersCount }
    }))
=======
    const db = getDb()
    const whereClause = search ? or(
      like(clients.name, `%${search}%`),
      like(clients.email, `%${search}%`),
      like(clients.phone, `%${search}%`),
      like(clients.document, `%${search}%`)
    ) : undefined

    const [clientsData, totalResult] = await Promise.all([
      db.select({
        ...getTableColumns(clients),
        serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.clientId} = ${clients.id})`
      })
      .from(clients)
      .where(whereClause)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(skip),
      db.select({ count: count() }).from(clients).where(whereClause)
    ])
>>>>>>> Stashed changes

    const total = totalResult[0].count

    // Format response to match Prisma structure
    const formattedClients = clientsData.map(client => ({
      ...client,
      _count: {
        serviceOrders: client.serviceOrdersCount
      },
      serviceOrdersCount: undefined // remove internal field
    }))

    return NextResponse.json({
      clients: formattedClients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar cliente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = clientSchema.parse(body)
    
    const db = getRequestContext().env.DB

<<<<<<< Updated upstream
    // Check if email or document exists
    const existing = await db.prepare(
      'SELECT id FROM clients WHERE email = ? OR document = ?'
    ).bind(data.email, data.document).first()

    if (existing) {
=======
    const db = getDb()
    
    // Verificar se cliente já existe
    const existingClient = await db.select().from(clients).where(
      or(
        eq(clients.email, email),
        eq(clients.document, document)
      )
    ).limit(1)

    if (existingClient.length > 0) {
>>>>>>> Stashed changes
      return NextResponse.json(
        { error: 'Cliente já existe com este email ou documento' },
        { status: 400 }
      )
    }

<<<<<<< Updated upstream
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
=======
    const id = uuidv4()
    const newClient = await db.insert(clients).values({
      id,
      name,
      email,
      phone,
      address,
      document,
      city,
      state,
      zipCode,
      complement,
      country,
      latitude,
      longitude,
      clientType,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()
>>>>>>> Stashed changes

    const fields = [
      'id', 'name', 'email', 'phone', 'address', 'document', 'city', 'state', 'zipCode', 
      'complement', 'country', 'latitude', 'longitude', 'clientType', 'createdAt', 'updatedAt'
    ]
    const placeholders = fields.map(() => '?').join(', ')
    
    await db.prepare(
      `INSERT INTO clients (${fields.join(', ')}) VALUES (${placeholders})`
    ).bind(
      id, data.name, data.email, data.phone, data.address, data.document, data.city, data.state, data.zipCode,
      data.complement || null, data.country, data.latitude || null, data.longitude || null, data.clientType, now, now
    ).run()

<<<<<<< Updated upstream
    const client = { id, ...data, createdAt: now, updatedAt: now }

    return NextResponse.json(client, { status: 201 })
=======
    return NextResponse.json({
      message: 'Cliente criado com sucesso',
      client: newClient[0]
    }, { status: 201 })
>>>>>>> Stashed changes

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
