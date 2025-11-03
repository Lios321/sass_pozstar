import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken, getTokenFromRequest } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NotificationService } from '@/lib/notifications'
import { ReceiptService } from '@/lib/receipt-service'
import { ServiceOrderStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

// Interfaces para tipos de dados
// Eliminado uso de 'mode' para compatibilidad con Prisma/SQLite
interface ServiceOrderWhereClause {
  OR?: Array<{
    orderNumber?: { contains: string };
    equipmentType?: { contains: string };
    brand?: { contains: string };
    model?: { contains: string };
    serialNumber?: { contains: string };
    client?: { name: { contains: string } };
    technician?: { name: { contains: string } };
  }>;
  status?: ServiceOrderStatus | { in: ServiceOrderStatus[] };
  clientId?: string;
  technicianId?: string;
}

interface ProcessedServiceOrderData {
  clientId: string;
  technicianId?: string;
  equipmentType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  reportedDefect: string;
  receivedAccessories?: string;
  budgetNote?: string;
  arrivalDate: Date | string;
  openingDate?: Date | string;
  completionDate?: Date | string;
  deliveryDate?: Date | string;
  paymentDate?: Date | string;
}

const serviceOrderSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  technicianId: z.string().optional(),
  equipmentType: z.string().min(2, 'Tipo de equipamento é obrigatório'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  reportedDefect: z.string().min(5, 'Defeito relatado deve ter pelo menos 5 caracteres'),
  receivedAccessories: z.string().optional(),
  budgetNote: z.string().optional(),
  technicalExplanation: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  budgetItems: z.any().optional(),
  arrivalDate: z.string().min(1, 'Data de chegada é obrigatória'),
  openingDate: z.string().optional(),
  completionDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  paymentDate: z.string().optional()
})

// GET - Listar ordens de serviço
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const technicianId = searchParams.get('technicianId')
    // Ordenação
    const sortField = (searchParams.get('sortField') || 'orderNumber') as string
    const sortDirection = (searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

    const skip = (page - 1) * limit

    // Use Prisma's official where type to avoid shape mismatches
    const where: Prisma.ServiceOrderWhereInput = {}

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { equipmentType: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { serialNumber: { contains: search } },
        { client: { is: { name: { contains: search } } } },
        { technician: { is: { name: { contains: search } } } }
      ]
    }

    if (status && Object.values(ServiceOrderStatus).includes(status as ServiceOrderStatus)) {
      where.status = status as ServiceOrderStatus
    } else {
      // Segurança defensiva: evita quebra caso existam valores legados inválidos na base
      where.status = { in: Object.values(ServiceOrderStatus) as ServiceOrderStatus[] }
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (technicianId) {
      where.technicianId = technicianId
    }

    // Mapear ordenação para campos válidos
    let orderBy: Prisma.ServiceOrderOrderByWithRelationInput = { orderNumber: sortDirection }
    switch (sortField) {
      case 'openingDate':
        orderBy = { openingDate: sortDirection }
        break
      case 'clientName':
        orderBy = { client: { name: sortDirection } }
        break
      case 'equipmentType':
        orderBy = { equipmentType: sortDirection }
        break
      case 'brand':
        orderBy = { brand: sortDirection }
        break
      case 'status':
        orderBy = { status: sortDirection }
        break
      case 'orderNumber':
      default:
        orderBy = { orderNumber: sortDirection }
        break
    }

    const [serviceOrders, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
              phone: true
            }
          }
        }
      }),
      prisma.serviceOrder.count({ where })
    ])

    return NextResponse.json({
      serviceOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar ordens de serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar ordem de serviço
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const user = getUserFromToken(token)

    // Para desenvolvimento, vamos criar um usuário padrão se não houver autenticação
    let userId = user?.id
    
    if (!userId) {
      // Buscar ou criar um usuário padrão para desenvolvimento
      let defaultUser = await prisma.user.findFirst({
        where: { email: 'admin@pozstar.com' }
      })
      
      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            email: 'admin@pozstar.com',
            name: 'Administrador',
            password: 'temp-password', // Em produção, isso deve ser hasheado
            role: 'ADMIN'
          }
        })
      }
      
      userId = defaultUser.id
    }

    const body = await request.json()
    console.log('Dados recebidos:', JSON.stringify(body, null, 2))
    
    const data = serviceOrderSchema.parse(body)
    console.log('Dados validados:', JSON.stringify(data, null, 2))

    // Verificar se cliente existe
    const client = await prisma.client.findUnique({
      where: { id: data.clientId }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se técnico existe (apenas se fornecido)
    if (data.technicianId) {
      const technician = await prisma.technician.findUnique({
        where: { id: data.technicianId }
      })

      if (!technician) {
        return NextResponse.json(
          { error: 'Técnico não encontrado' },
          { status: 404 }
        )
      }
    }

    // Gerar número da OS no formato OS-YYYY-N (sequência anual)
    const openingDate = data.openingDate ? new Date(data.openingDate) : new Date()
    const year = openingDate.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)

    const countThisYear = await prisma.serviceOrder.count({
      where: {
        openingDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    })

    const nextNumber = countThisYear + 1
    const orderNumber = `OS-${year}-${nextNumber}`

    const newServiceOrder = await prisma.serviceOrder.create({
      data: {
        orderNumber,
        clientId: data.clientId,
        technicianId: data.technicianId || null,
        equipmentType: data.equipmentType,
        brand: data.brand || '',
        model: data.model || '',
        serialNumber: data.serialNumber || null,
        reportedDefect: data.reportedDefect,
        receivedAccessories: data.receivedAccessories || null,
        budgetNote: data.budgetNote || null,
        technicalExplanation: data.technicalExplanation || null,
        price: data.price ?? null,
        cost: data.cost ?? null,
        budgetItems: data.budgetItems ?? null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
        completionDate: data.completionDate ? new Date(data.completionDate) : null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        status: ServiceOrderStatus.SEM_VER,
        createdById: userId as string
      }
    })

    // Criar notificação para nova ordem de serviço
    try {
      await NotificationService.createNewServiceOrderNotification(newServiceOrder.id)
    } catch (notificationError) {
      console.error('Erro ao criar notificação:', notificationError)
      // Não falhar a criação da OS por causa da notificação
    }

    // Gerar comprovante para download em background
    try {
      setImmediate(() => {
        ReceiptService.generateReceiptForDownload(newServiceOrder.id)
          .catch(error => {
            console.error('Erro na geração do comprovante:', error)
          })
      })
    } catch (receiptError) {
      console.error('Erro ao iniciar geração do comprovante:', receiptError)
      // Não falhar a criação da OS por causa do comprovante
    }

    return NextResponse.json({
      message: 'Ordem de serviço criada com sucesso',
      serviceOrder: newServiceOrder
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar ordem de serviço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}