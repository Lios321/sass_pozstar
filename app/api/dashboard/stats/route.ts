import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias
    const db = getRequestContext().env.DB

    // Calculate dates
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))
    const startDateStr = startDate.toISOString()

    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period))
    const previousPeriodStartStr = previousPeriodStart.toISOString()

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
      ordersByStatus,
      ordersByMonth: ordersByMonthRaw,
      technicianPerformance
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
