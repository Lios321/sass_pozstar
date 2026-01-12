import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ServiceOrderStatus } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Interfaces para tipos de dados
interface ServiceOrderWhereClause {
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  status?: ServiceOrderStatus;
  technicianId?: string;
  clientId?: string;
  equipmentType?: {
    contains: string;
  };
}

interface ServiceOrderForReport {
  id: string;
  status: ServiceOrderStatus;
  equipmentType: string;
  openingDate: Date | null;
  completionDate: Date | null;
  budgetNote: string | null;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  technician: {
    id: string;
    name: string;
    email: string;
    specializations: string | null;
  } | null;
}

// Schema de validação para filtros de relatório
const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(ServiceOrderStatus).optional(),
  technicianId: z.string().optional(),
  clientId: z.string().optional(),
  equipmentType: z.string().optional(),
  format: z.enum(['json', 'pdf', 'excel']).default('json')
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Validar parâmetros
    const filters = reportFiltersSchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      technicianId: searchParams.get('technicianId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      equipmentType: searchParams.get('equipmentType') || undefined,
      format: searchParams.get('format') || 'json'
    })

    // Construir filtros para o Prisma
    const whereClause: ServiceOrderWhereClause = {}

    // Filtro por período
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = new Date(filters.endDate)
      }
    }

    // Filtros específicos
    if (filters.status) {
      whereClause.status = filters.status
    }
    if (filters.technicianId) {
      whereClause.technicianId = filters.technicianId
    }
    if (filters.clientId) {
      whereClause.clientId = filters.clientId
    }
    if (filters.equipmentType) {
      whereClause.equipmentType = {
        contains: filters.equipmentType
      }
    }

    // Buscar ordens de serviço com relacionamentos
    const serviceOrders = await prisma.serviceOrder.findMany({
      where: whereClause,
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
            specializations: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calcular estatísticas
    const stats = {
      total: serviceOrders.length,
      byStatus: Object.values(ServiceOrderStatus).reduce((acc: Record<ServiceOrderStatus, number>, status) => {
        acc[status] = serviceOrders.filter((so: ServiceOrderForReport) => so.status === status).length
        return acc
      }, {} as Record<ServiceOrderStatus, number>),
      byEquipmentType: serviceOrders.reduce((acc: Record<string, number>, so: ServiceOrderForReport) => {
        acc[so.equipmentType] = (acc[so.equipmentType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      averageCompletionTime: calculateAverageCompletionTime(serviceOrders),
      totalRevenue: calculateTotalRevenue(serviceOrders)
    }

    // Buscar técnicos e clientes para filtros
    const technicians = await prisma.technician.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const reportData = {
      filters: filters,
      stats: stats,
      serviceOrders: serviceOrders,
      metadata: {
        technicians: technicians,
        clients: clients,
        generatedAt: new Date().toISOString(),
        totalRecords: serviceOrders.length
      }
    }

    // Retornar dados baseado no formato solicitado
    if (filters.format === 'json') {
      return NextResponse.json(reportData)
    }

    // Para PDF e Excel, retornar dados para processamento no frontend
    return NextResponse.json({
      ...reportData,
      downloadFormat: filters.format
    })

  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para calcular tempo médio de conclusão
function calculateAverageCompletionTime(serviceOrders: ServiceOrderForReport[]): number | null {
  const completedOrders = serviceOrders.filter(so => 
    so.openingDate && so.completionDate
  )

  if (completedOrders.length === 0) return null

  const totalDays = completedOrders.reduce((acc, so) => {
    if (!so.openingDate || !so.completionDate) return acc
    const start = new Date(so.openingDate)
    const end = new Date(so.completionDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return acc + diffDays
  }, 0)

  return Math.round(totalDays / completedOrders.length)
}

// Função auxiliar para calcular receita total (baseado em budgetNote)
function calculateTotalRevenue(serviceOrders: ServiceOrderForReport[]): number {
  return serviceOrders.reduce((acc, so) => {
    if (so.budgetNote && so.completionDate) {
      // Extrair valor do budgetNote (formato: "R$ 250,00")
      const match = so.budgetNote.match(/R\$\s*([\d.,]+)/)
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'))
        return acc + value
      }
    }
    return acc
  }, 0)
}