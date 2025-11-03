import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

interface NotificationFilter {
  isRead: boolean;
  userId?: string;
  clientId?: string;
}

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

    // Construir filtros
    const where: NotificationFilter = {
      isRead: false
    }
    
    if (userId) where.userId = userId
    if (clientId) where.clientId = clientId

    // Marcar todas as notificações como lidas
    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      message: 'Notificações marcadas como lidas',
      count: result.count
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