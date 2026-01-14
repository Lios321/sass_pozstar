import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { getRequestContext } from '@cloudflare/next-on-pages'
import { z } from 'zod'

export const runtime = 'edge'
=======
import { getDb } from '@/lib/db/drizzle'
import { notifications } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export const runtime = 'edge';
>>>>>>> Stashed changes

const markAllReadSchema = z.object({
  userId: z.string().optional(),
  clientId: z.string().optional()
})

// POST /api/notifications/mark-all-read - Marcar todas as notificações como lidas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, clientId } = markAllReadSchema.parse(body)

    // Validar se pelo menos um filtro foi especificado
    if (!userId && !clientId) {
      return NextResponse.json(
        { error: 'Pelo menos um filtro (userId ou clientId) deve ser especificado' },
        { status: 400 }
      )
    }

<<<<<<< Updated upstream
    const db = getRequestContext().env.DB
    let query = 'UPDATE notifications SET isRead = 1, updatedAt = ? WHERE isRead = 0'
    const params: any[] = [new Date().toISOString()]

    if (userId) {
      query += ' AND userId = ?'
      params.push(userId)
    }
    if (clientId) {
      query += ' AND clientId = ?'
      params.push(clientId)
    }

    const result = await db.prepare(query).bind(...params).run()

    return NextResponse.json({
      message: 'Notificações marcadas como lidas',
      count: result.meta.changes
=======
    const db = await getDb()

    // Construir filtros
    const conditions = [eq(notifications.isRead, false)]
    
    if (userId) conditions.push(eq(notifications.userId, userId))
    if (clientId) conditions.push(eq(notifications.clientId, clientId))

    // Marcar todas as notificações como lidas
    const updated = await db.update(notifications)
      .set({
        isRead: true,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning({ id: notifications.id })

    return NextResponse.json({
      message: 'Notificações marcadas como lidas',
      count: updated.length
>>>>>>> Stashed changes
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao marcar notificações como lidas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}