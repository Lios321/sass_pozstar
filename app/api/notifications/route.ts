import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { z } from 'zod'

export const runtime = 'edge'

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

    return NextResponse.json({
      notifications,
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