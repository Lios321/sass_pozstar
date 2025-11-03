import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { ServiceOrderStatus } from '@prisma/client'

interface TechnicianPerformance {
  technicianId: string | null;
  _count: {
    technicianId: number;
  };
}

interface Technician {
  id: string;
  name: string;
}

interface OrdersByStatus {
  status: ServiceOrderStatus;
  _count: {
    status: number;
  };
}

// GET - Estatísticas do dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Estatísticas gerais
    const [
      totalClients,
      totalTechnicians,
      totalServiceOrders,
      pendingOrders,
      completedOrders,
      recentOrders,
      ordersByStatus,
       technicianPerformance
     ] = await Promise.all([
      // Total de clientes
      prisma.client.count(),
      
      // Total de técnicos
      prisma.technician.count(),
      
      // Total de ordens de serviço
      prisma.serviceOrder.count(),
      
      // Ordens pendentes (não finalizadas)
      prisma.serviceOrder.count({
        where: {
          status: {
            in: [
              ServiceOrderStatus.SEM_VER,
              ServiceOrderStatus.ORCAMENTAR,
              ServiceOrderStatus.APROVADO,
              ServiceOrderStatus.ESPERANDO_PECAS,
              ServiceOrderStatus.COMPRADO,
              ServiceOrderStatus.MELHORAR,
              ServiceOrderStatus.ESPERANDO_CLIENTE,
              ServiceOrderStatus.DEVOLVIDO,
            ]
          }
        }
      }),
      
      // Ordens concluídas no período (TERMINADO)
      prisma.serviceOrder.count({
        where: {
          status: ServiceOrderStatus.TERMINADO,
          completionDate: {
            gte: startDate
          }
        }
      }),
      
      // Ordens recentes (últimas 10)
      prisma.serviceOrder.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { name: true }
          },
          technician: {
            select: { name: true }
          }
        }
      }),
      
      // Distribuição por status
      prisma.serviceOrder.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      }),
      
      // Ordens por mês movido para fora de Promise.all
      
      // Performance dos técnicos
      prisma.serviceOrder.groupBy({
        by: ['technicianId'],
        where: {
          createdAt: {
            gte: startDate
          },
          technicianId: {
            not: null
          }
        },
        _count: {
          technicianId: true
        }
      })
    ])

    // Ordens por mês (últimos 6 meses) com fallback robusto
    let ordersByMonthRaw: Array<{ month: unknown; count: unknown }> = []
    try {
      ordersByMonthRaw = await prisma.$queryRaw`
        SELECT 
          strftime('%Y-%m', createdAt) as month,
          COUNT(*) as count
        FROM service_orders 
        WHERE createdAt >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY month
      `
    } catch (_err) {
      const now = new Date()
      const months: { month: string; count: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const count = await prisma.serviceOrder.count({
          where: {
            createdAt: {
              gte: from,
              lt: to
            }
          }
        })
        const monthLabel = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`
        months.push({ month: monthLabel, count })
      }
      ordersByMonthRaw = months
    }

    // Buscar nomes dos técnicos para performance
    const technicianIds = Array.from(new Set(
      technicianPerformance
        .map((tp: TechnicianPerformance) => tp.technicianId)
        .filter((id: string | null): id is string => Boolean(id))
    ))
    const technicians = technicianIds.length > 0
      ? await prisma.technician.findMany({
          where: {
            id: {
              in: technicianIds as string[]
            }
          },
          select: {
            id: true,
            name: true
          }
        })
      : []

    const technicianPerformanceWithNames = technicianPerformance.map((tp: TechnicianPerformance) => {
      const technician = technicians.find((t: Technician) => t.id === tp.technicianId)
      return {
        name: technician?.name || 'Desconhecido',
        completedOrders: tp._count.technicianId
      }
    })

    // Normalize ordersByMonth to ensure count is a JSON-serializable number
    const ordersByMonthNormalized = Array.isArray(ordersByMonthRaw)
    ? ordersByMonthRaw.map((row) => ({
           month: String(row.month ?? ''),
           count: Number(row.count ?? 0),
         }))
       : []

    // Calcular taxa de crescimento
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period))

    const previousPeriodOrders = await prisma.serviceOrder.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    })

    const currentPeriodOrders = await prisma.serviceOrder.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    })

    const growthRate = previousPeriodOrders > 0 
      ? ((currentPeriodOrders - previousPeriodOrders) / previousPeriodOrders) * 100 
      : 0

    const body = {
      totalClients,
      totalTechnicians,
      totalServiceOrders,
      pendingOrders,
      completedOrders,
      growthRate: Math.round(growthRate * 100) / 100,
      recentOrders,
      ordersByStatus: ordersByStatus.map((item: OrdersByStatus) => ({
        name: String(item.status),
        value: item._count.status
      })),
      ordersByMonth: ordersByMonthNormalized,
      technicianPerformance: technicianPerformanceWithNames
    }

    // Curto cache privado para aliviar carga do banco (1 minuto)
    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}