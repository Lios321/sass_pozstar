import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { z } from 'zod'

export const runtime = 'edge'

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'STATUS_UPDATE']).optional()
})

// GET /api/notifications/[id] - Buscar notificação por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getRequestContext().env.DB
    
    const notification: any = await db.prepare(`
      SELECT 
        n.*,
        u.id as user_id, u.name as user_name, u.email as user_email,
        c.id as client_id, c.name as client_name, c.email as client_email,
        so.id as so_id, so.orderNumber as so_orderNumber, so.status as so_status
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      LEFT JOIN clients c ON n.clientId = c.id
      LEFT JOIN service_orders so ON n.serviceOrderId = so.id
      WHERE n.id = ?
    `).bind(id).first()

    if (!notification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    // Format response
    const formatted = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead === 1,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      userId: notification.userId,
      clientId: notification.clientId,
      serviceOrderId: notification.serviceOrderId,
      user: notification.user_id ? { id: notification.user_id, name: notification.user_name, email: notification.user_email } : null,
      client: notification.client_id ? { id: notification.client_id, name: notification.client_name, email: notification.client_email } : null,
      serviceOrder: notification.so_id ? { id: notification.so_id, orderNumber: notification.so_orderNumber, status: notification.so_status } : null
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Erro ao buscar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/[id] - Atualizar notificação
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const data = updateNotificationSchema.parse(body)
    const db = getRequestContext().env.DB

    // Verificar se a notificação existe
    const existingNotification: any = await db.prepare('SELECT id FROM notifications WHERE id = ?').bind(id).first()

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    const updates: string[] = []
    const values: any[] = []

    if (data.isRead !== undefined) {
      updates.push('isRead = ?')
      values.push(data.isRead ? 1 : 0)
    }
    if (data.title !== undefined) {
      updates.push('title = ?')
      values.push(data.title)
    }
    if (data.message !== undefined) {
      updates.push('message = ?')
      values.push(data.message)
    }
    if (data.type !== undefined) {
      updates.push('type = ?')
      values.push(data.type)
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?')
      values.push(new Date().toISOString())
      values.push(id)

      await db.prepare(`UPDATE notifications SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    }

    // Return updated notification with relations
    const notification: any = await db.prepare(`
      SELECT 
        n.*,
        u.id as user_id, u.name as user_name, u.email as user_email,
        c.id as client_id, c.name as client_name, c.email as client_email,
        so.id as so_id, so.orderNumber as so_orderNumber, so.status as so_status
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      LEFT JOIN clients c ON n.clientId = c.id
      LEFT JOIN service_orders so ON n.serviceOrderId = so.id
      WHERE n.id = ?
    `).bind(id).first()

    const formatted = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead === 1,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      userId: notification.userId,
      clientId: notification.clientId,
      serviceOrderId: notification.serviceOrderId,
      user: notification.user_id ? { id: notification.user_id, name: notification.user_name, email: notification.user_email } : null,
      client: notification.client_id ? { id: notification.client_id, name: notification.client_name, email: notification.client_email } : null,
      serviceOrder: notification.so_id ? { id: notification.so_id, orderNumber: notification.so_orderNumber, status: notification.so_status } : null
    }

    return NextResponse.json(formatted)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Deletar notificação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getRequestContext().env.DB

    // Verificar se a notificação existe
    const existingNotification: any = await db.prepare('SELECT id FROM notifications WHERE id = ?').bind(id).first()

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    // Deletar notificação
    await db.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run()

    return NextResponse.json({ message: 'Notificação deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}