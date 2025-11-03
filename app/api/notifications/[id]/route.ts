import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

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
    const notification = await prisma.notification.findUnique({
      where: {
        id: id
      },
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

    if (!notification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(notification)
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

    // Verificar se a notificação existe
    const existingNotification = await prisma.notification.findUnique({
      where: { id: id }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar notificação
    const notification = await prisma.notification.update({
      where: {
        id: id
      },
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

    return NextResponse.json(notification)
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
    // Verificar se a notificação existe
    const existingNotification = await prisma.notification.findUnique({
      where: { id: id }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    // Deletar notificação
    await prisma.notification.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ message: 'Notificação deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}