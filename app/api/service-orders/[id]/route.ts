import { NextRequest, NextResponse } from 'next/server'
import { ServiceOrderStatus, ReceiptDeliveryMethod } from '@prisma/client'
import { NotificationService } from '@/lib/notifications'
import { ReceiptService } from '@/lib/receipt-service'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendTemplate } from '@/lib/whatsapp'
import { buildTemplatePayload } from '@/lib/whatsapp-templates'

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
  status?: ServiceOrderStatus;
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
    return items.map((raw) => {
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

      if (item.hasOwnProperty('estimatedHours')) {
        sanitized.estimatedHours = Number.isFinite(estimatedHours) ? estimatedHours : 0
      }

      // Preservar outros campos primitivos (evitar undefined)
      for (const key of Object.keys(item)) {
        if (!(key in sanitized)) {
          const value = item[key]
          if (value === undefined) continue
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
            sanitized[key] = typeof value === 'number' && !Number.isFinite(value) ? null : value
          }
        }
      }

      return sanitized
    })
  } catch {
    // Fallback para remover valores indefinidos/circulares
    return JSON.parse(JSON.stringify(items))
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
  status: z.nativeEnum(ServiceOrderStatus).optional(),
  arrivalDate: z.string().optional(),
  openingDate: z.string().optional(),
  completionDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  paymentDate: z.string().optional()
})

// GET /api/service-orders/[id] - Buscar ordem de serviço por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: id },
      include: {
        client: true,
        technician: true
      }
    })

    if (!serviceOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(serviceOrder)
  } catch (error) {
    console.error('Erro ao buscar ordem de serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/service-orders/[id] - Atualizar ordem de serviço
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const validatedData = updateServiceOrderSchema.parse(body)

    const { id } = await params;

    // Verificar se a ordem de serviço existe
    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id: id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o cliente existe (se fornecido)
    if (validatedData.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: validatedData.clientId }
      })

      if (!client) {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 400 }
        )
      }
    }

    // Verificar se o técnico existe (se fornecido)
    if (validatedData.technicianId) {
      const technician = await prisma.technician.findUnique({
        where: { id: validatedData.technicianId }
      })

      if (!technician) {
        return NextResponse.json(
          { error: 'Técnico não encontrado' },
          { status: 400 }
        )
      }
    }

    // Regra: restrições de transição quando ordem está SEM_VER
    if (existingOrder.status === ServiceOrderStatus.SEM_VER && validatedData.status) {
      const allowedFromSemVer = [
        ServiceOrderStatus.ORCAMENTAR,
        ServiceOrderStatus.DEVOLVIDO,
        ServiceOrderStatus.DESCARTE,
      ]
      if (!allowedFromSemVer.includes(validatedData.status as (typeof allowedFromSemVer)[number])) {
        return NextResponse.json(
          { error: 'Do estado SEM_VER só pode mudar para ORCAMENTAR, DEVOLVIDO ou DESCARTE.' },
          { status: 400 }
        )
      }
    }

    // Regra: para mover para APROVADO é necessário um técnico atribuído
    if (validatedData.status === ServiceOrderStatus.APROVADO) {
      const technicianId = validatedData.technicianId ?? existingOrder.technicianId
      if (!technicianId) {
        return NextResponse.json(
          { error: 'Para mover para "Aprovado" é necessário atribuir um técnico.' },
          { status: 400 }
        )
      }
    }

     // Regra: para mover para MELHORAR é necessário um técnico atribuído
     if (validatedData.status === ServiceOrderStatus.MELHORAR) {
       const technicianId = validatedData.technicianId ?? existingOrder.technicianId
       if (!technicianId) {
         return NextResponse.json(
           { error: 'Para mover para "Melhorar" é necessário atribuir um técnico.' },
           { status: 400 }
         )
       }
     }

     // Preparar dados para atualização
     const updateData: UpdateServiceOrderData = {
       ...validatedData,
       updatedAt: new Date()
     }

     // Sanitizar itens de orçamento se presentes
     if (Object.prototype.hasOwnProperty.call(validatedData, 'budgetItems')) {
       updateData.budgetItems = sanitizeBudgetItems(validatedData.budgetItems)
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
     const prismaUpdateData: any = { ...updateData }
     if (Object.prototype.hasOwnProperty.call(validatedData, 'technicianId')) {
       delete prismaUpdateData.technicianId
       if (validatedData.technicianId) {
         prismaUpdateData.technician = { connect: { id: validatedData.technicianId } }
       } else {
         prismaUpdateData.technician = { disconnect: true }
       }
     }

     const updatedOrder = await prisma.serviceOrder.update({
       where: { id: id },
       data: prismaUpdateData,
       include: {
         client: true,
         technician: true
       }
     })

    // Ao sair de SEM_VER: informar posição na fila
    try {
      if (
        existingOrder.status === ServiceOrderStatus.SEM_VER &&
        validatedData.status &&
        validatedData.status !== ServiceOrderStatus.SEM_VER
      ) {
        const countAhead = await prisma.serviceOrder.count({
          where: {
            status: ServiceOrderStatus.SEM_VER,
            openingDate: { lt: existingOrder.openingDate },
          },
        })
        const to = updatedOrder.client?.phone || ""
        if (to) {
          const payload = buildTemplatePayload("equipamentos_pendentes_abertura", {
            nome: updatedOrder.client?.name || "Cliente",
            equipamento: updatedOrder.equipmentType,
            quantidade: String(countAhead),
          })
          if (payload) {
            const result = await sendTemplate({
              to,
              name: payload.name,
              language: payload.language,
              components: payload.components,
            })
            await prisma.notification.create({
              data: {
                title: result.ok ? "WhatsApp enviado" : "Falha no WhatsApp",
                message: result.ok
                  ? `Fila de abertura • ${updatedOrder.client?.name || ""} • à frente: ${countAhead}`
                  : `Fila de abertura • erro: ${String(result.error || "send_failed")}`,
                type: result.ok ? "SUCCESS" : "ERROR",
                clientId: updatedOrder.clientId,
                serviceOrderId: updatedOrder.id,
              },
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
           existingOrder.status,
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

     // Ao entrar em ORCAMENTAR: gerar comprovante e enviar ao cliente (background)
     try {
       if (
         validatedData.status &&
         validatedData.status !== existingOrder.status &&
         validatedData.status === ServiceOrderStatus.ORCAMENTAR
       ) {
         setImmediate(() => {
           // 1) Gera/atualiza o comprovante no banco
           ReceiptService.generateReceiptForDownload(id)
             .then(async () => {
               // Também gerar e salvar o PDF de orçamento (se houver itens)
               try {
                 await ReceiptService.generateBudgetForOrcamentar(id)
               } catch (err) {
                 console.error('Erro ao gerar orçamento (ORCAMENTAR):', err)
               }

               // 2) Escolhe métodos disponíveis conforme contato do cliente
               const methods: ReceiptDeliveryMethod[] = []
               if (updatedOrder.client?.email) methods.push(ReceiptDeliveryMethod.EMAIL)
               if (updatedOrder.client?.phone) methods.push(ReceiptDeliveryMethod.WHATSAPP)

               if (methods.length === 0) {
                 console.warn(`Cliente sem contato para envio de comprovante - OS: ${id}`)
                 return
               }

               // 3) Envia por cada método disponível
               await Promise.all(
                 methods.map((m) => ReceiptService.resendReceipt(id, m))
               )
               try {
                 const { sendBudgetWhatsApp } = await import('@/lib/budget-notify')
                 await sendBudgetWhatsApp(id)
               } catch (err) {
                 console.error('Erro ao enviar orçamento por WhatsApp:', err)
               }
              })
              .catch((err) => {
                console.error('Erro na geração/envio de comprovante (ORCAMENTAR):', err)
              })
          })
       }
     } catch (receiptFlowError) {
       console.error('Erro ao agendar geração/envio de comprovante:', receiptFlowError)
       // Não falhar a atualização por causa do envio de comprovante
     }

     return NextResponse.json(updatedOrder)
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

// DELETE /api/service-orders/[id] - Excluir ordem de serviço
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se a ordem de serviço existe
    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id: id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a ordem pode ser excluída (por exemplo, não permitir exclusão de ordens concluídas)
    if (existingOrder.status === ServiceOrderStatus.TERMINADO) {
      return NextResponse.json(
        { error: 'Não é possível excluir ordens de serviço concluídas' },
        { status: 400 }
      )
    }

    // Excluir dependências para evitar erro de restrição de chave estrangeira
    await prisma.$transaction([
      prisma.receiptDelivery.deleteMany({ where: { serviceOrderId: id } }),
      prisma.notification.deleteMany({ where: { serviceOrderId: id } }),
      prisma.serviceOrder.delete({ where: { id } }),
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
