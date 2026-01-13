import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Enumeração de status (baseada no uso comum do projeto)
const ServiceOrderStatus = [
  'SEM_VER', 'ORCAMENTAR', 'APROVADO', 'ESPERANDO_PECAS', 
  'COMPRADO', 'MELHORAR', 'TERMINADO', 'SEM_PROBLEMA',
  'ESPERANDO_CLIENTE', 'DEVOLVIDO'
] as const

// Schema de validação para filtros de relatório
const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(ServiceOrderStatus as [string, ...string[]]).optional(),
  technicianId: z.string().optional(),
  clientId: z.string().optional(),
  equipmentType: z.string().optional(),
  format: z.enum(['json', 'pdf', 'excel']).default('json')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validar parâmetros
    // Nota: O Zod enum validation pode falhar se o status passado não estiver na lista.
    // Como estamos migrando, vamos ser permissivos se o status vier como string
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      technicianId: searchParams.get('technicianId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      equipmentType: searchParams.get('equipmentType') || undefined,
      format: searchParams.get('format') || 'json'
    }

    const db = getRequestContext().env.DB

    // Construir query SQL
    let query = `
      SELECT so.*, 
        c.name as client_name, c.email as client_email, c.phone as client_phone,
        t.name as technician_name, t.email as technician_email, t.specializations as technician_specializations,
        u.name as creator_name, u.email as creator_email
      FROM service_orders so
      LEFT JOIN clients c ON so.clientId = c.id
      LEFT JOIN technicians t ON so.technicianId = t.id
      LEFT JOIN users u ON so.createdById = u.id
      WHERE 1=1
    `
    const params: any[] = []

    // Filtro por período
    if (filters.startDate) {
      query += ` AND so.createdAt >= ?`
      params.push(new Date(filters.startDate).toISOString())
    }
    if (filters.endDate) {
      query += ` AND so.createdAt <= ?`
      params.push(new Date(filters.endDate).toISOString())
    }

    // Filtros específicos
    if (filters.status) {
      query += ` AND so.status = ?`
      params.push(filters.status)
    }
    if (filters.technicianId) {
      query += ` AND so.technicianId = ?`
      params.push(filters.technicianId)
    }
    if (filters.clientId) {
      query += ` AND so.clientId = ?`
      params.push(filters.clientId)
    }
    if (filters.equipmentType) {
      query += ` AND so.equipmentType LIKE ?`
      params.push(`%${filters.equipmentType}%`)
    }

    query += ` ORDER BY so.createdAt DESC`

    // Buscar ordens de serviço
    const { results } = await db.prepare(query).bind(...params).all()

    // Formatar resultados para ServiceOrderForReport
    const serviceOrders = results.map((so: any) => ({
      ...so,
      client: {
        id: so.clientId,
        name: so.client_name,
        email: so.client_email,
        phone: so.client_phone
      },
      technician: so.technicianId ? {
        id: so.technicianId,
        name: so.technician_name,
        email: so.technician_email,
        specializations: so.technician_specializations
      } : null,
      createdBy: so.createdById ? {
        id: so.createdById,
        name: so.creator_name,
        email: so.creator_email
      } : null
    }))

    // Calcular estatísticas
    const stats = {
      total: serviceOrders.length,
      byStatus: ServiceOrderStatus.reduce((acc: Record<string, number>, status) => {
        acc[status] = serviceOrders.filter((so: any) => so.status === status).length
        return acc
      }, {} as Record<string, number>),
      byEquipmentType: serviceOrders.reduce((acc: Record<string, number>, so: any) => {
        const type = so.equipmentType || 'Outros'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      averageCompletionTime: calculateAverageCompletionTime(serviceOrders),
      totalRevenue: calculateTotalRevenue(serviceOrders)
    }

    // Buscar técnicos e clientes para filtros (metadados)
    const { results: technicians } = await db.prepare(`
      SELECT id, name, email FROM technicians ORDER BY name ASC
    `).all()

    const { results: clients } = await db.prepare(`
      SELECT id, name, email FROM clients ORDER BY name ASC
    `).all()

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
function calculateAverageCompletionTime(serviceOrders: any[]): number | null {
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
function calculateTotalRevenue(serviceOrders: any[]): number {
  return serviceOrders.reduce((acc, so) => {
    if (so.budgetNote && so.completionDate) {
      // Extrair valor do budgetNote (formato: "R$ 250,00")
      const match = so.budgetNote.match(/R\$\s*([\d.,]+)/)
      if (match) {
        // Tratar formato brasileiro: 1.250,00 -> 1250.00
        // Remover pontos de milhar, substituir vírgula decimal por ponto
        const valueStr = match[1].replace(/\./g, '').replace(',', '.')
        const value = parseFloat(valueStr)
        return acc + (isNaN(value) ? 0 : value)
      }
    }
    return acc
  }, 0)
}
