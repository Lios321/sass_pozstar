import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

=======
import { getDb } from '@/lib/db/drizzle'
import { serviceOrders, clients, technicians } from '@/lib/db/schema'
import { eq, inArray, gte, lt, count, desc, sql, and, isNotNull } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const runtime = 'edge';

const ServiceOrderStatus = {
  SEM_VER: 'SEM_VER',
  ORCAMENTAR: 'ORCAMENTAR',
  APROVADO: 'APROVADO',
  MELHORAR: 'MELHORAR',
  DEVOLVIDO: 'DEVOLVIDO',
  DESCARTE: 'DESCARTE',
  TERMINADO: 'TERMINADO',
  ESPERANDO_PECAS: 'ESPERANDO_PECAS',
  COMPRADO: 'COMPRADO',
  ESPERANDO_CLIENTE: 'ESPERANDO_CLIENTE'
} as const;

interface TechnicianPerformance {
  technicianId: string | null;
  count: number;
}

interface OrdersByStatus {
  status: string;
  count: number;
}

// GET - Estatísticas do dashboard
>>>>>>> Stashed changes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB
=======
    const db = await getDb()
>>>>>>> Stashed changes

    // Calculate dates
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))
    const startDateStr = startDate.toISOString()

<<<<<<< Updated upstream
=======
    // Total de clientes
    const totalClientsResult = await db.select({ count: count() }).from(clients)
    const totalClients = totalClientsResult[0]?.count || 0

    // Total de técnicos
    const totalTechniciansResult = await db.select({ count: count() }).from(technicians)
    const totalTechnicians = totalTechniciansResult[0]?.count || 0

    // Total de ordens de serviço
    const totalServiceOrdersResult = await db.select({ count: count() }).from(serviceOrders)
    const totalServiceOrders = totalServiceOrdersResult[0]?.count || 0

    // Ordens pendentes (não finalizadas)
    const pendingOrdersResult = await db.select({ count: count() }).from(serviceOrders).where(inArray(serviceOrders.status, [
      ServiceOrderStatus.SEM_VER,
      ServiceOrderStatus.ORCAMENTAR,
      ServiceOrderStatus.APROVADO,
      ServiceOrderStatus.ESPERANDO_PECAS,
      ServiceOrderStatus.COMPRADO,
      ServiceOrderStatus.MELHORAR,
      ServiceOrderStatus.ESPERANDO_CLIENTE,
      ServiceOrderStatus.DEVOLVIDO,
    ]))
    const pendingOrders = pendingOrdersResult[0]?.count || 0

    // Ordens concluídas no período (TERMINADO)
    const completedOrdersResult = await db.select({ count: count() }).from(serviceOrders).where(and(
      eq(serviceOrders.status, ServiceOrderStatus.TERMINADO),
      gte(serviceOrders.completionDate, startDate)
    ))
    const completedOrders = completedOrdersResult[0]?.count || 0

    // Ordens recentes (últimas 10)
    const recentOrders = await db.query.serviceOrders.findMany({
      limit: 10,
      orderBy: [desc(serviceOrders.createdAt)],
      with: {
        client: {
          columns: { name: true }
        },
        technician: {
          columns: { name: true }
        }
      }
    })

    // Distribuição por status
    const ordersByStatusResult = await db.select({
      status: serviceOrders.status,
      count: count()
    })
    .from(serviceOrders)
    .groupBy(serviceOrders.status)

    const ordersByStatus = ordersByStatusResult.map(item => ({
      status: item.status,
      _count: { status: item.count }
    }))

    // Performance dos técnicos
    const technicianPerformanceResult = await db.select({
      technicianId: serviceOrders.technicianId,
      count: count()
    })
    .from(serviceOrders)
    .where(and(
      gte(serviceOrders.createdAt, startDate),
      isNotNull(serviceOrders.technicianId)
    ))
    .groupBy(serviceOrders.technicianId)

    const technicianPerformance = technicianPerformanceResult.map(item => ({
      technicianId: item.technicianId,
      _count: { technicianId: item.count }
    }))

    // Ordens por mês (últimos 6 meses)
    let ordersByMonthRaw: Array<{ month: string; count: number }> = []
    try {
      // D1 SQLite syntax
      const result = await db.all<{ month: string, count: number }>(sql`
        SELECT 
          strftime('%Y-%m', created_at / 1000, 'unixepoch') as month,
          COUNT(*) as count
        FROM service_orders 
        WHERE created_at >= strftime('%s', 'now', '-6 months') * 1000
        GROUP BY month
        ORDER BY month
      `)
      ordersByMonthRaw = result
    } catch (err) {
       // Fallback logic if raw query fails or locally without D1 binding working perfectly
       // Note: In Drizzle D1, we might need a different way to access raw query if .all is not exposed directly on db instance wrapper
       // If getDb returns drizzle(env.DB), it has .run, .all, .values, etc. but drizzle-orm/d1 wrapper might hide it.
       // Actually drizzle(d1) returns a Drizzle D1 instance which has methods like select, insert, etc.
       // For raw queries in Drizzle D1: db.run(sql`...`) returns D1Result.
       // But to get rows we often use .all() on the statement if we use raw binding, but with Drizzle we should use:
       // const res = await db.select({ ... }).from(sql`...`) or just construct the query.
       
       // Let's use the fallback loop approach which is safer and database agnostic enough for this simple case
      const now = new Date()
      const months: { month: string; count: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const countResult = await db.select({ count: count() }).from(serviceOrders).where(and(
          gte(serviceOrders.createdAt, from),
          lt(serviceOrders.createdAt, to)
        ))
        const monthLabel = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`
        months.push({ month: monthLabel, count: countResult[0]?.count || 0 })
      }
      ordersByMonthRaw = months
    }

    // Buscar nomes dos técnicos para performance
    const technicianIds = Array.from(new Set(
      technicianPerformance
        .map((tp) => tp.technicianId)
        .filter((id): id is string => Boolean(id))
    ))
    
    let techniciansData: { id: string, name: string }[] = []
    if (technicianIds.length > 0) {
      techniciansData = await db.select({ id: technicians.id, name: technicians.name })
        .from(technicians)
        .where(inArray(technicians.id, technicianIds))
    }

    const technicianPerformanceWithNames = technicianPerformance.map((tp) => {
      const technician = techniciansData.find((t) => t.id === tp.technicianId)
      return {
        name: technician?.name || 'Desconhecido',
        completedOrders: tp._count.technicianId
      }
    })

    // Normalize ordersByMonth
    const ordersByMonthNormalized = Array.isArray(ordersByMonthRaw)
    ? ordersByMonthRaw.map((row) => ({
           month: String(row.month ?? ''),
           count: Number(row.count ?? 0),
         }))
       : []

    // Calcular taxa de crescimento
>>>>>>> Stashed changes
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period))
    const previousPeriodStartStr = previousPeriodStart.toISOString()

<<<<<<< Updated upstream
    // Parallel queries
    const queries = [
        db.prepare('SELECT COUNT(*) as count FROM clients').first(),
        db.prepare('SELECT COUNT(*) as count FROM technicians').first(),
        db.prepare('SELECT COUNT(*) as count FROM service_orders').first(),
        db.prepare(`
            SELECT COUNT(*) as count FROM service_orders 
            WHERE status IN ('SEM_VER', 'ORCAMENTAR', 'APROVADO', 'ESPERANDO_PECAS', 'COMPRADO', 'MELHORAR', 'ESPERANDO_CLIENTE', 'DEVOLVIDO')
        `).first(),
        db.prepare(`
            SELECT COUNT(*) as count FROM service_orders 
            WHERE status = 'TERMINADO' AND completionDate >= ?
        `).bind(startDateStr).first(),
        db.prepare(`
            SELECT so.*, c.name as clientName, t.name as technicianName 
            FROM service_orders so
            LEFT JOIN clients c ON so.clientId = c.id
            LEFT JOIN technicians t ON so.technicianId = t.id
            ORDER BY so.createdAt DESC LIMIT 10
        `).all(),
        db.prepare(`
            SELECT status, COUNT(*) as count FROM service_orders GROUP BY status
        `).all(),
        db.prepare(`
            SELECT technicianId, COUNT(*) as count 
            FROM service_orders 
            WHERE createdAt >= ? AND technicianId IS NOT NULL 
            GROUP BY technicianId
        `).bind(startDateStr).all(),
        // Growth rate queries
        db.prepare(`SELECT COUNT(*) as count FROM service_orders WHERE createdAt >= ? AND createdAt < ?`).bind(previousPeriodStartStr, startDateStr).first(),
        db.prepare(`SELECT COUNT(*) as count FROM service_orders WHERE createdAt >= ?`).bind(startDateStr).first(),
        // Orders by month
        db.prepare(`
            SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count
            FROM service_orders
            WHERE createdAt >= date('now', '-6 months')
            GROUP BY month
            ORDER BY month
        `).all()
    ]

    const results = await Promise.all(queries)
    
    const totalClients = (results[0] as any).count
    const totalTechnicians = (results[1] as any).count
    const totalServiceOrders = (results[2] as any).count
    const pendingOrders = (results[3] as any).count
    const completedOrders = (results[4] as any).count
    const recentOrdersRaw = (results[5] as any).results
    const ordersByStatusRaw = (results[6] as any).results
    const technicianPerformanceRaw = (results[7] as any).results
    const previousPeriodOrders = (results[8] as any).count
    const currentPeriodOrders = (results[9] as any).count
    const ordersByMonthRaw = (results[10] as any).results
=======
    const previousPeriodOrdersResult = await db.select({ count: count() }).from(serviceOrders).where(and(
        gte(serviceOrders.createdAt, previousPeriodStart),
        lt(serviceOrders.createdAt, startDate)
    ))
    const previousPeriodOrders = previousPeriodOrdersResult[0]?.count || 0

    const currentPeriodOrdersResult = await db.select({ count: count() }).from(serviceOrders).where(
        gte(serviceOrders.createdAt, startDate)
    )
    const currentPeriodOrders = currentPeriodOrdersResult[0]?.count || 0
>>>>>>> Stashed changes

    // Format Recent Orders
    const recentOrders = recentOrdersRaw.map((o: any) => ({
        ...o,
        client: { name: o.clientName },
        technician: { name: o.technicianName }
    }))

    // Format Orders By Status
    const ordersByStatus = ordersByStatusRaw.map((o: any) => ({
        name: o.status,
        value: o.count
    }))

    // Format Technician Performance
    // Need to fetch technician names for the IDs
    const techIds = technicianPerformanceRaw.map((tp: any) => tp.technicianId).filter(Boolean)
    let technicianNames: Record<string, string> = {}
    
    if (techIds.length > 0) {
        // SQL IN clause
        const placeholders = techIds.map(() => '?').join(',')
        const techResults = await db.prepare(`SELECT id, name FROM technicians WHERE id IN (${placeholders})`)
            .bind(...techIds)
            .all()
        
        techResults.results.forEach((t: any) => {
            technicianNames[t.id] = t.name
        })
    }

    const technicianPerformance = technicianPerformanceRaw.map((tp: any) => ({
        name: technicianNames[tp.technicianId] || 'Desconhecido',
        completedOrders: tp.count
    }))

    // Growth Rate
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
<<<<<<< Updated upstream
      ordersByStatus,
      ordersByMonth: ordersByMonthRaw,
      technicianPerformance
=======
      ordersByStatus: ordersByStatus.map((item) => ({
        name: String(item.status),
        value: item._count.status
      })),
      ordersByMonth: ordersByMonthNormalized,
      technicianPerformance: technicianPerformanceWithNames
>>>>>>> Stashed changes
    }

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
