import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, ServiceOrder, Client, Technician } from '@prisma/client'

const prisma = new PrismaClient()

type ServiceOrderWithRelations = ServiceOrder & {
  client: Pick<Client, 'id' | 'name' | 'email' | 'phone'>;
  technician: Pick<Technician, 'id' | 'name' | 'email' | 'phone' | 'specializations'> | null;
}

// GET /api/client/service-orders - Buscar ordens de serviço do cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar ordens de serviço do cliente
    const serviceOrders = await prisma.serviceOrder.findMany({
      where: {
        clientId: clientId
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specializations: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formatar dados para o cliente
    const formattedOrders = serviceOrders.map((order: ServiceOrderWithRelations) => ({
      id: order.id,
      serviceOrderNumber: order.orderNumber,
      equipmentType: order.equipmentType,
      brand: order.brand,
      model: order.model,
      reportedDefect: order.reportedDefect,
      status: order.status,
      serialNumber: order.serialNumber,
      receivedAccessories: order.receivedAccessories,
      budgetNote: order.budgetNote,
      arrivalDate: order.arrivalDate,
      openingDate: order.openingDate,
      completionDate: order.completionDate,
      deliveryDate: order.deliveryDate,
      paymentDate: order.paymentDate,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      technician: order.technician ? {
        name: order.technician.name,
        specializations: order.technician.specializations
      } : null,
      // Calcular progresso baseado no status
      progress: getProgressByStatus(order.status)
    }))

    return NextResponse.json({
      serviceOrders: formattedOrders,
      total: formattedOrders.length
    })
  } catch (error) {
    console.error('Erro ao buscar ordens de serviço do cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

function getProgressByStatus(status: string): number {
  const statusProgress: { [key: string]: number } = {
    'PENDING': 10,
    'IN_ANALYSIS': 25,
    'APPROVED': 40,
    'IN_PROGRESS': 60,
    'WAITING_PARTS': 70,
    'TESTING': 85,
    'COMPLETED': 100,
    'DELIVERED': 100,
    'CANCELLED': 0
  }
  
  return statusProgress[status] || 0
}