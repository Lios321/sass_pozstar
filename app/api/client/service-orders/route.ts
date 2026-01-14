import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
=======
import { getDb } from '@/lib/db/drizzle'
import { serviceOrders } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export const runtime = 'edge';
>>>>>>> Stashed changes

// GET /api/client/service-orders - Buscar ordens de serviço do cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const db = await getDb()

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const db = getRequestContext().env.DB

    // Buscar ordens de serviço do cliente
<<<<<<< Updated upstream
    const { results } = await db.prepare(`
      SELECT so.*, 
        c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone,
        t.id as technician_id, t.name as technician_name, t.email as technician_email, t.phone as technician_phone, t.specializations as technician_specializations
      FROM service_orders so
      LEFT JOIN clients c ON so.clientId = c.id
      LEFT JOIN technicians t ON so.technicianId = t.id
      WHERE so.clientId = ?
      ORDER BY so.createdAt DESC
    `).bind(clientId).all()

    // Formatar dados para o cliente
    const formattedOrders = results.map((order: any) => {
      const technicianSpecializations = order.technician_specializations 
        ? (typeof order.technician_specializations === 'string' ? JSON.parse(order.technician_specializations) : order.technician_specializations)
        : []

      return {
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
        technician: order.technician_id ? {
          name: order.technician_name,
          specializations: technicianSpecializations
        } : null,
        // Calcular progresso baseado no status
        progress: getProgressByStatus(order.status as string)
      }
    })
=======
    const serviceOrdersResult = await db.query.serviceOrders.findMany({
      where: eq(serviceOrders.clientId, clientId),
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        technician: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specializations: true
          }
        }
      },
      orderBy: [desc(serviceOrders.createdAt)]
    })

    // Formatar dados para o cliente
    const formattedOrders = serviceOrdersResult.map((order) => ({
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
>>>>>>> Stashed changes

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
    'SEM_VER': 10, // Assuming mapping from old PENDING? Or based on new statuses
    'PENDING': 10,
    'IN_ANALYSIS': 25,
    'ORCAMENTAR': 25,
    'APPROVED': 40,
    'APROVADO': 40,
    'IN_PROGRESS': 60,
    'ESPERANDO_PECAS': 60,
    'WAITING_PARTS': 70,
    'TESTING': 85,
    'MELHORAR': 85,
    'COMPLETED': 100,
    'TERMINADO': 100,
    'DELIVERED': 100,
    'DEVOLVIDO': 100,
    'CANCELLED': 0,
    'DESCARTE': 0
  }
  
  return statusProgress[status] || 0
}
