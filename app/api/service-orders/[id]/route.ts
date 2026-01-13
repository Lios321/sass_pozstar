import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

// Removed Prisma dependencies
// import { NotificationService } from '@/lib/notifications'
// import { ReceiptService } from '@/lib/receipt-service'

export const runtime = 'edge'

const ServiceOrderStatus = {
  SEM_VER: 'SEM_VER',
  ORCAMENTAR: 'ORCAMENTAR',
  APROVADO: 'APROVADO',
  ESPERANDO_PECAS: 'ESPERANDO_PECAS',
  COMPRADO: 'COMPRADO',
  MELHORAR: 'MELHORAR',
  ESPERANDO_CLIENTE: 'ESPERANDO_CLIENTE',
  DEVOLVIDO: 'DEVOLVIDO',
  DESCARTE: 'DESCARTE',
  TERMINADO: 'TERMINADO'
}

// Interface para dados de atualização
interface UpdateServiceOrderData {
  clientId?: string;
  technicianId?: string;
  equipmentType?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  reportedDefect?: string;
  receivedAccessories?: string;
  budgetNote?: string;
  technicalExplanation?: string;
  price?: number;
  cost?: number;
  budgetItems?: any;
  status?: string;
  arrivalDate?: Date | string;
  openingDate?: Date | string;
  completionDate?: Date | string;
  deliveryDate?: Date | string;
  paymentDate?: Date | string;
  updatedAt: Date;
}

// Função para sanitizar itens de orçamento antes de salvar como JSON
function sanitizeBudgetItems(items: any): any {
  try {
    if (!Array.isArray(items)) return items
    return JSON.stringify(items.map((raw: any) => {
      const item = typeof raw === 'object' && raw !== null ? raw : {}
      const quantity = Number(item.quantity)
      const unitCost = Number(item.unitCost)
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : undefined
      const estimatedHours = Number(item.estimatedHours)

      const sanitized: any = {
        type: typeof item.type === 'string' ? item.type : String(item.type ?? ''),
        description: typeof item.description === 'string' ? item.description : '',
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unitCost: Number.isFinite(unitCost) ? unitCost : 0,
      }

      if (unitPrice !== undefined) {
        sanitized.unitPrice = Number.isFinite(unitPrice) ? unitPrice : null
      }

      if (Object.prototype.hasOwnProperty.call(item, 'estimatedHours')) {
        sanitized.estimatedHours = Number.isFinite(estimatedHours) ? estimatedHours : 0
      }

      return sanitized
    }))
  } catch {
    return '[]'
  }
}

const updateServiceOrderSchema = z.object({
  clientId: z.string().optional(),
  technicianId: z.string().optional(),
  equipmentType: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  reportedDefect: z.string().optional(),
  receivedAccessories: z.string().optional(),
  budgetNote: z.string().optional(),
  technicalExplanation: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  budgetItems: z.any().optional(),
  status: z.string().optional(),
  arrivalDate: z.string().optional(),
  openingDate: z.string().optional(),
  completionDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  paymentDate: z.string().optional()
})

// GET /api/service-orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getRequestContext().env.DB

    const serviceOrder: any = await db.prepare(`
        SELECT so.*, c.name as clientName, t.name as technicianName 
        FROM service_orders so
        LEFT JOIN clients c ON so.clientId = c.id
        LEFT JOIN technicians t ON so.technicianId = t.id
        WHERE so.id = ?
    `).bind(id).first()

    if (!serviceOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Format output to match expected Prisma structure roughly
    const formatted = {
        ...serviceOrder,
        client: serviceOrder.clientId ? { id: serviceOrder.clientId, name: serviceOrder.clientName } : null,
        technician: serviceOrder.technicianId ? { id: serviceOrder.technicianId, name: serviceOrder.technicianName } : null
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Erro ao buscar ordem de serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/service-orders/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const validatedData = updateServiceOrderSchema.parse(body)
    const { id } = await params;
    const db = getRequestContext().env.DB

    // Verificar se a ordem de serviço existe
    const existingOrder: any = await db.prepare('SELECT * FROM service_orders WHERE id = ?').bind(id).first()

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o cliente existe
    if (validatedData.clientId) {
      const client = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(validatedData.clientId).first()
      if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
    }

    // Verificar se o técnico existe
    if (validatedData.technicianId) {
      const technician = await db.prepare('SELECT id FROM technicians WHERE id = ?').bind(validatedData.technicianId).first()
      if (!technician) return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 400 })
    }

    // Regras de Status
    if (existingOrder.status === ServiceOrderStatus.SEM_VER && validatedData.status) {
      const allowedFromSemVer = [
        ServiceOrderStatus.ORCAMENTAR,
        ServiceOrderStatus.DEVOLVIDO,
        ServiceOrderStatus.DESCARTE,
      ]
      if (!allowedFromSemVer.includes(validatedData.status)) {
        return NextResponse.json(
          { error: 'Do estado SEM_VER só pode mudar para ORCAMENTAR, DEVOLVIDO ou DESCARTE.' },
          { status: 400 }
        )
      }
    }

    if (validatedData.status === ServiceOrderStatus.APROVADO) {
      const technicianId = validatedData.technicianId ?? existingOrder.technicianId
      if (!technicianId) {
        return NextResponse.json(
          { error: 'Para mover para "Aprovado" é necessário atribuir um técnico.' },
          { status: 400 }
        )
      }
    }

    if (validatedData.status === ServiceOrderStatus.MELHORAR) {
       const technicianId = validatedData.technicianId ?? existingOrder.technicianId
       if (!technicianId) {
         return NextResponse.json(
           { error: 'Para mover para "Melhorar" é necessário atribuir um técnico.' },
           { status: 400 }
         )
       }
     }

     // Prepare Update
     const data: any = { ...validatedData, updatedAt: new Date().toISOString() }
     
     if (data.budgetItems) {
        data.budgetItems = sanitizeBudgetItems(data.budgetItems)
     }

     // Dates
     const dateFields = ['arrivalDate', 'openingDate', 'completionDate', 'deliveryDate', 'paymentDate']
     dateFields.forEach(field => {
         if (data[field]) data[field] = new Date(data[field]).toISOString()
     })

     if (data.status === ServiceOrderStatus.TERMINADO && !data.completionDate && !existingOrder.completionDate) {
       data.completionDate = new Date().toISOString()
     }

     if (data.status === ServiceOrderStatus.DEVOLVIDO && !data.deliveryDate && !existingOrder.deliveryDate) {
       data.deliveryDate = new Date().toISOString()
     }

     // Build Query
     const keys = Object.keys(data)
     if (keys.length > 0) {
        const setClause = keys.map(key => `${key} = ?`).join(', ')
        const values = Object.values(data)
        values.push(id)
        await db.prepare(`UPDATE service_orders SET ${setClause} WHERE id = ?`).bind(...values).run()
     }

     // Fetch updated
     const updatedOrder: any = await db.prepare(`
        SELECT so.*, 
            c.id as clientId, c.name as clientName, c.email as clientEmail, c.phone as clientPhone,
            t.id as technicianId, t.name as technicianName, t.email as technicianEmail, t.phone as technicianPhone
        FROM service_orders so
        LEFT JOIN clients c ON so.clientId = c.id
        LEFT JOIN technicians t ON so.technicianId = t.id
        WHERE so.id = ?
    `).bind(id).first()

    // TODO: Implement Notifications and Receipts logic compatible with Cloudflare Workers (using Queues or direct DB inserts)
    // Currently disabled to allow migration to proceed.

     return NextResponse.json({
         ...updatedOrder,
         client: updatedOrder.clientId ? { 
             id: updatedOrder.clientId, 
             name: updatedOrder.clientName,
             email: updatedOrder.clientEmail,
             phone: updatedOrder.clientPhone
         } : null,
         technician: updatedOrder.technicianId ? { 
             id: updatedOrder.technicianId, 
             name: updatedOrder.technicianName,
             email: updatedOrder.technicianEmail,
             phone: updatedOrder.technicianPhone
         } : null
     })

   } catch (error) {
     if (error instanceof z.ZodError) {
       return NextResponse.json(
         { error: 'Dados inválidos', details: error.issues },
         { status: 400 }
       )
     }

     console.error('Erro ao atualizar ordem de serviço:', error)
     return NextResponse.json(
       { error: 'Erro interno do servidor' },
       { status: 500 }
     )
   }
}

// DELETE /api/service-orders/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getRequestContext().env.DB

    const existingOrder: any = await db.prepare('SELECT status FROM service_orders WHERE id = ?').bind(id).first()

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    if (existingOrder.status === ServiceOrderStatus.TERMINADO) {
      return NextResponse.json(
        { error: 'Não é possível excluir ordens de serviço concluídas' },
        { status: 400 }
      )
    }

    // Manual Cascade Delete
    await db.batch([
        db.prepare('DELETE FROM receipt_deliveries WHERE serviceOrderId = ?').bind(id),
        db.prepare('DELETE FROM notifications WHERE serviceOrderId = ?').bind(id),
        db.prepare('DELETE FROM service_orders WHERE id = ?').bind(id)
    ])

    return NextResponse.json({ message: 'Ordem de serviço excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir ordem de serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
