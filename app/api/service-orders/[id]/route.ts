import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

// Removed Prisma dependencies
// import { NotificationService } from '@/lib/notifications'
// import { ReceiptService } from '@/lib/receipt-service'

export const runtime = 'edge'

=======
import { NotificationService } from '@/lib/notifications'
import { ReceiptService } from '@/lib/receipt-service'
import { z } from 'zod'
import { getDb } from '@/lib/db/drizzle'
import { serviceOrders, clients, technicians, notifications, receiptDeliveries } from '@/lib/db/schema'
import { eq, and, lt, count } from 'drizzle-orm'
import { sendTemplate } from '@/lib/whatsapp'
import { buildTemplatePayload } from '@/lib/whatsapp-templates'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge';

// Enum definitions matching schema
>>>>>>> Stashed changes
const ServiceOrderStatus = {
  SEM_VER: 'SEM_VER',
  ORCAMENTAR: 'ORCAMENTAR',
  APROVADO: 'APROVADO',
<<<<<<< Updated upstream
  ESPERANDO_PECAS: 'ESPERANDO_PECAS',
  COMPRADO: 'COMPRADO',
  MELHORAR: 'MELHORAR',
  ESPERANDO_CLIENTE: 'ESPERANDO_CLIENTE',
  DEVOLVIDO: 'DEVOLVIDO',
  DESCARTE: 'DESCARTE',
  TERMINADO: 'TERMINADO'
}
=======
  MELHORAR: 'MELHORAR',
  DEVOLVIDO: 'DEVOLVIDO',
  DESCARTE: 'DESCARTE',
  TERMINADO: 'TERMINADO'
} as const;

const ReceiptDeliveryMethod = {
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP'
} as const;
>>>>>>> Stashed changes

// Interface para dados de atualização
interface UpdateServiceOrderData {
  clientId?: string;
  technicianId?: string | null;
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
<<<<<<< Updated upstream
  status: z.string().optional(),
=======
  status: z.enum(['SEM_VER', 'ORCAMENTAR', 'APROVADO', 'MELHORAR', 'DEVOLVIDO', 'DESCARTE', 'TERMINADO']).optional(),
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB

    const serviceOrder: any = await db.prepare(`
        SELECT so.*, c.name as clientName, t.name as technicianName 
        FROM service_orders so
        LEFT JOIN clients c ON so.clientId = c.id
        LEFT JOIN technicians t ON so.technicianId = t.id
        WHERE so.id = ?
    `).bind(id).first()
=======
    const db = await getDb()
    const serviceOrder = await db.query.serviceOrders.findFirst({
      where: eq(serviceOrders.id, id),
      with: {
        client: true,
        technician: true
      }
    })
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB

    // Verificar se a ordem de serviço existe
    const existingOrder: any = await db.prepare('SELECT * FROM service_orders WHERE id = ?').bind(id).first()
=======
    const db = await getDb()

    // Verificar se a ordem de serviço existe
    const existingOrder = await db.query.serviceOrders.findFirst({
      where: eq(serviceOrders.id, id),
      with: {
        client: true
      }
    })
>>>>>>> Stashed changes

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o cliente existe
    if (validatedData.clientId) {
<<<<<<< Updated upstream
      const client = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(validatedData.clientId).first()
      if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 400 })
=======
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, validatedData.clientId)
      })

      if (!client) {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 400 }
        )
      }
>>>>>>> Stashed changes
    }

    // Verificar se o técnico existe
    if (validatedData.technicianId) {
<<<<<<< Updated upstream
      const technician = await db.prepare('SELECT id FROM technicians WHERE id = ?').bind(validatedData.technicianId).first()
      if (!technician) return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 400 })
=======
      const technician = await db.query.technicians.findFirst({
        where: eq(technicians.id, validatedData.technicianId)
      })

      if (!technician) {
        return NextResponse.json(
          { error: 'Técnico não encontrado' },
          { status: 400 }
        )
      }
>>>>>>> Stashed changes
    }

    // Regras de Status
    if (existingOrder.status === ServiceOrderStatus.SEM_VER && validatedData.status) {
      const allowedFromSemVer = [
        ServiceOrderStatus.ORCAMENTAR,
        ServiceOrderStatus.DEVOLVIDO,
        ServiceOrderStatus.DESCARTE,
      ]
<<<<<<< Updated upstream
      if (!allowedFromSemVer.includes(validatedData.status)) {
=======
      if (!allowedFromSemVer.includes(validatedData.status as any)) {
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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

=======
     // Sanitizar itens de orçamento se presentes
     if (Object.prototype.hasOwnProperty.call(validatedData, 'budgetItems')) {
       updateData.budgetItems = sanitizeBudgetItems(validatedData.budgetItems)
       if (updateData.budgetItems) {
         updateData.budgetItems = JSON.stringify(updateData.budgetItems)
       }
     }

     // Converter datas se fornecidas
     if (validatedData.arrivalDate) {
       updateData.arrivalDate = new Date(validatedData.arrivalDate)
     }
     if (validatedData.openingDate) {
       updateData.openingDate = new Date(validatedData.openingDate)
     }
     if (validatedData.completionDate) {
       updateData.completionDate = new Date(validatedData.completionDate)
     }
     if (validatedData.deliveryDate) {
       updateData.deliveryDate = new Date(validatedData.deliveryDate)
     }
     if (validatedData.paymentDate) {
       updateData.paymentDate = new Date(validatedData.paymentDate)
     }

     // Se o status for alterado para TERMINADO e não houver data de conclusão, definir agora
     if (validatedData.status === ServiceOrderStatus.TERMINADO && !validatedData.completionDate && !existingOrder.completionDate) {
       updateData.completionDate = new Date()
     }

     // Se o status for alterado para DEVOLVIDO e não houver data de entrega, definir agora
     if (validatedData.status === ServiceOrderStatus.DEVOLVIDO && !validatedData.deliveryDate && !existingOrder.deliveryDate) {
       updateData.deliveryDate = new Date()
     }

     // Mapear atualização de técnico via relação
     // Drizzle handles this by setting technicianId directly
     if (Object.prototype.hasOwnProperty.call(validatedData, 'technicianId')) {
       if (validatedData.technicianId) {
         updateData.technicianId = validatedData.technicianId
       } else {
         updateData.technicianId = null
       }
     }

     const [updatedOrder] = await db.update(serviceOrders)
       .set(updateData as any)
       .where(eq(serviceOrders.id, id))
       .returning()

     // Refetch with relations
     const updatedOrderWithRelations = await db.query.serviceOrders.findFirst({
       where: eq(serviceOrders.id, id),
       with: {
         client: true,
         technician: true
       }
     })

     if (!updatedOrderWithRelations) {
        // Should not happen
        return NextResponse.json({ error: 'Erro ao recuperar ordem atualizada' }, { status: 500 })
     }

    // Ao sair de SEM_VER: informar posição na fila
    try {
      if (
        existingOrder.status === ServiceOrderStatus.SEM_VER &&
        validatedData.status &&
        validatedData.status !== ServiceOrderStatus.SEM_VER
      ) {
        const countAheadResult = await db.select({ count: count() })
          .from(serviceOrders)
          .where(and(
            eq(serviceOrders.status, ServiceOrderStatus.SEM_VER),
            lt(serviceOrders.openingDate, existingOrder.openingDate as Date)
          ))
        const countAhead = countAheadResult[0]?.count || 0

        const to = updatedOrderWithRelations.client?.phone || ""
        if (to) {
          const payload = buildTemplatePayload("equipamentos_pendentes_abertura", {
            nome: updatedOrderWithRelations.client?.name || "Cliente",
            equipamento: updatedOrderWithRelations.equipmentType,
            quantidade: String(countAhead),
          })
          if (payload) {
            const result = await sendTemplate({
              to,
              name: payload.name,
              language: payload.language,
              components: payload.components,
            })
            
            await db.insert(notifications).values({
              id: uuidv4(),
              title: result.ok ? "WhatsApp enviado" : "Falha no WhatsApp",
              message: result.ok
                ? `Fila de abertura • ${updatedOrderWithRelations.client?.name || ""} • à frente: ${countAhead}`
                : `Fila de abertura • erro: ${String(result.error || "send_failed")}`,
              type: result.ok ? "SUCCESS" : "ERROR",
              clientId: updatedOrderWithRelations.clientId,
              serviceOrderId: updatedOrderWithRelations.id,
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }
      }
    } catch (err) {
      console.warn("Falha ao enviar WhatsApp de saída de SEM_VER:", err)
    }

     // Criar notificações se necessário
     try {
       // Notificação de mudança de status
       if (validatedData.status && validatedData.status !== existingOrder.status) {
         await NotificationService.createServiceOrderStatusNotification(
           id,
           existingOrder.status!,
           validatedData.status
         )
       }

       // Notificação de técnico atribuído
       if (validatedData.technicianId && validatedData.technicianId !== existingOrder.technicianId) {
         await NotificationService.createTechnicianAssignedNotification(
           id
         )
       }
     } catch (notificationError) {
       console.error('Erro ao criar notificação:', notificationError)
       // Não falhar a atualização por causa da notificação
     }

     // Ao entrar em ORCAMENTAR: gerar comprovante e enviar ao cliente
     try {
       if (
         validatedData.status &&
         validatedData.status !== existingOrder.status &&
         validatedData.status === ServiceOrderStatus.ORCAMENTAR
       ) {
         // Executar operações de comprovante (await para garantir execução no Edge)
         (async () => {
           try {
             // 1) Gera/atualiza o comprovante no banco
             await ReceiptService.generateReceiptForDownload(id);
             
             // Também gerar e salvar o PDF de orçamento (se houver itens)
             try {
               await ReceiptService.generateBudgetForOrcamentar(id);
             } catch (err) {
               console.error('Erro ao gerar orçamento (ORCAMENTAR):', err);
             }

             // 2) Escolhe métodos disponíveis conforme contato do cliente
             const methods: string[] = [];
             if (updatedOrderWithRelations.client?.email) methods.push(ReceiptDeliveryMethod.EMAIL);
             if (updatedOrderWithRelations.client?.phone) methods.push(ReceiptDeliveryMethod.WHATSAPP);

             if (methods.length === 0) {
               console.warn(`Cliente sem contato para envio de comprovante - OS: ${id}`);
               return;
             }

             // 3) Envia por cada método disponível
             await Promise.all(
               methods.map((m) => ReceiptService.resendReceipt(id, m as any))
             );
             
             try {
               const { sendBudgetWhatsApp } = await import('@/lib/budget-notify');
               await sendBudgetWhatsApp(id);
             } catch (err) {
               console.error('Erro ao enviar orçamento por WhatsApp:', err);
             }
           } catch (err) {
             console.error('Erro na geração/envio de comprovante (ORCAMENTAR):', err);
           }
         })();
       }
     } catch (receiptFlowError) {
       console.error('Erro ao iniciar fluxo de comprovante:', receiptFlowError);
       // Não falhar a atualização por causa do envio de comprovante
     }

     return NextResponse.json(updatedOrderWithRelations)
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB

    const existingOrder: any = await db.prepare('SELECT status FROM service_orders WHERE id = ?').bind(id).first()
=======
    const db = await getDb()

    // Verificar se a ordem de serviço existe
    const existingOrder = await db.query.serviceOrders.findFirst({
      where: eq(serviceOrders.id, id)
    })
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
    // Manual Cascade Delete
    await db.batch([
        db.prepare('DELETE FROM receipt_deliveries WHERE serviceOrderId = ?').bind(id),
        db.prepare('DELETE FROM notifications WHERE serviceOrderId = ?').bind(id),
        db.prepare('DELETE FROM service_orders WHERE id = ?').bind(id)
=======
    // Excluir dependências para evitar erro de restrição de chave estrangeira
    // Using batch for transaction-like behavior in D1
    await db.batch([
        db.delete(receiptDeliveries).where(eq(receiptDeliveries.serviceOrderId, id)),
        db.delete(notifications).where(eq(notifications.serviceOrderId, id)),
        db.delete(serviceOrders).where(eq(serviceOrders.id, id))
>>>>>>> Stashed changes
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
