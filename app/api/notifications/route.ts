import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { getRequestContext } from '@cloudflare/next-on-pages'
=======
import { getDb } from '@/lib/db/drizzle'
import { notifications } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
>>>>>>> Stashed changes
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

<<<<<<< Updated upstream
export const runtime = 'edge'
=======
export const runtime = 'edge';
>>>>>>> Stashed changes

const createNotificationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'STATUS_UPDATE']).default('INFO'),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  serviceOrderId: z.string().optional()
})

// GET /api/notifications - Listar notificações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const userId = searchParams.get('userId')
    const clientId = searchParams.get('clientId')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')

<<<<<<< Updated upstream
    const offset = (page - 1) * limit
    const db = getRequestContext().env.DB

    // Construir filtros
    const conditions: string[] = []
    const params: any[] = []

    if (userId) {
      conditions.push('n.userId = ?')
      params.push(userId)
    }
    if (clientId) {
      conditions.push('n.clientId = ?')
      params.push(clientId)
    }
    if (isRead !== null) {
      conditions.push('n.isRead = ?')
      params.push(isRead === 'true' ? 1 : 0)
    }
    if (type) {
      conditions.push('n.type = ?')
      params.push(type)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Contar total
    const totalResult: any = await db.prepare(
      `SELECT COUNT(*) as total FROM notifications n ${whereClause}`
    ).bind(...params).first()
    const total = totalResult?.total || 0

    // Buscar notificações
    const query = `
      SELECT 
        n.*,
        u.id as user_id, u.name as user_name, u.email as user_email,
        c.id as client_id, c.name as client_name, c.email as client_email,
        so.id as so_id, so.orderNumber as so_orderNumber, so.status as so_status
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      LEFT JOIN clients c ON n.clientId = c.id
      LEFT JOIN service_orders so ON n.serviceOrderId = so.id
      ${whereClause}
      ORDER BY n.createdAt DESC
      LIMIT ? OFFSET ?
    `

    const { results } = await db.prepare(query).bind(...params, limit, offset).all()

    const notifications = results.map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type,
      isRead: row.isRead === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userId: row.userId,
      clientId: row.clientId,
      serviceOrderId: row.serviceOrderId,
      user: row.user_id ? { id: row.user_id, name: row.user_name, email: row.user_email } : null,
      client: row.client_id ? { id: row.client_id, name: row.client_name, email: row.client_email } : null,
      serviceOrder: row.so_id ? { id: row.so_id, orderNumber: row.so_orderNumber, status: row.so_status } : null
    }))
=======
    const skip = (page - 1) * limit
    const db = await getDb()

    // Construir filtros
    const conditions = []
    
    if (userId) conditions.push(eq(notifications.userId, userId))
    if (clientId) conditions.push(eq(notifications.clientId, clientId))
    if (isRead !== null) conditions.push(eq(notifications.isRead, isRead === 'true'))
    if (type && ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'STATUS_UPDATE'].includes(type)) {
      conditions.push(eq(notifications.type, type))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Buscar notificações
    const notificationsData = await db.query.notifications.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        client: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        serviceOrder: {
          columns: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      },
      orderBy: [desc(notifications.createdAt)],
      limit: limit,
      offset: skip
    })

    const totalResult = await db.select({ count: count() }).from(notifications).where(whereClause)
    const total = totalResult[0]?.count || 0
>>>>>>> Stashed changes

    return NextResponse.json({
      notifications: notificationsData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Criar notificação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createNotificationSchema.parse(body)

    // Validar se pelo menos um destinatário foi especificado
    if (!data.userId && !data.clientId) {
      return NextResponse.json({ error: 'Destinatário obrigatório (userId ou clientId)' }, { status: 400 })
    }

<<<<<<< Updated upstream
    const db = getRequestContext().env.DB
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.prepare(`
      INSERT INTO notifications (id, title, message, type, userId, clientId, serviceOrderId, isRead, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.title,
      data.message,
      data.type,
      data.userId || null,
      data.clientId || null,
      data.serviceOrderId || null,
      0,
      now,
      now
    ).run()

    const notification: any = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first()

    return NextResponse.json({
        ...notification,
        isRead: notification.isRead === 1
    })

=======
    const db = await getDb()

    // Criar notificação
    const [notification] = await db.insert(notifications)
      .values({
        id: uuidv4(),
        ...data,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    // Fetch related data to return consistent response
    const notificationWithRelations = await db.query.notifications.findFirst({
      where: eq(notifications.id, notification.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        client: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        serviceOrder: {
          columns: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(notificationWithRelations, { status: 201 })
>>>>>>> Stashed changes
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Erro ao criar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}