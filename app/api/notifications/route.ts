import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, NotificationType } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

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

    const skip = (page - 1) * limit

    // Construir filtros
    const where: { userId?: string; clientId?: string; isRead?: boolean; type?: NotificationType } = {}
    
    if (userId) where.userId = userId
    if (clientId) where.clientId = clientId
    if (isRead !== null) where.isRead = isRead === 'true'
    if (type && Object.values(NotificationType).includes(type as NotificationType)) {
      where.type = type as NotificationType
    }

    // Buscar notificações
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          serviceOrder: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ])

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
      return NextResponse.json(
        { error: 'Pelo menos um destinatário (userId ou clientId) deve ser especificado' },
        { status: 400 }
      )
    }

    // Criar notificação
    const notification = await prisma.notification.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        serviceOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(notification, { status: 201 })
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