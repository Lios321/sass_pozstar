import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { NotificationService } from '@/lib/notifications'
import { ReceiptService } from '@/lib/receipt-service'

export const runtime = 'edge'

const createSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  technicianId: z.string().optional(),
  equipmentType: z.string().min(1, 'Tipo de equipamento é obrigatório'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  serialNumber: z.string().optional(),
  reportedDefect: z.string().min(1, 'Defeito relatado é obrigatório'),
  receivedAccessories: z.string().optional(),
  status: z.string().optional().default('SEM_VER'),
})

<<<<<<< Updated upstream
=======
export const runtime = 'edge';

/**
 * GET /api/service-orders
 * Lista ordens de serviço paginadas e filtradas
 * @param request Objeto da requisição (query params: page, limit, search, sortField, sortDirection, status, clientId, technicianId)
 * @returns JSON com lista e paginação
 */
>>>>>>> Stashed changes
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status')
        const clientId = searchParams.get('clientId')
        const technicianId = searchParams.get('technicianId')
        
        const offset = (page - 1) * limit
        const db = getRequestContext().env.DB

        let whereClauses: string[] = []
        let params: any[] = []

        if (search) {
            whereClauses.push('(equipmentType LIKE ? OR brand LIKE ? OR model LIKE ? OR serialNumber LIKE ? OR id LIKE ?)')
            const s = `%${search}%`
            params.push(s, s, s, s, s)
        }
        if (status) {
            whereClauses.push('status = ?')
            params.push(status)
        }
        if (clientId) {
            whereClauses.push('clientId = ?')
            params.push(clientId)
        }
        if (technicianId) {
            whereClauses.push('technicianId = ?')
            params.push(technicianId)
        }

        const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

        const countQuery = `SELECT COUNT(*) as count FROM service_orders ${whereSQL}`
        const totalResult: any = await db.prepare(countQuery).bind(...params).first()
        const total = totalResult?.count || 0

        const query = `
            SELECT so.*, 
                c.id as clientId, c.name as clientName, c.email as clientEmail, c.phone as clientPhone,
                t.id as technicianId, t.name as technicianName, t.email as technicianEmail, t.phone as technicianPhone
            FROM service_orders so
            LEFT JOIN clients c ON so.clientId = c.id
            LEFT JOIN technicians t ON so.technicianId = t.id
            ${whereSQL}
            ORDER BY so.createdAt DESC
            LIMIT ? OFFSET ?
        `
        const { results } = await db.prepare(query).bind(...params, limit, offset).all()

        const formattedResults = results.map((row: any) => ({
            ...row,
            client: { 
                id: row.clientId,
                name: row.clientName,
                email: row.clientEmail,
                phone: row.clientPhone
            },
            technician: row.technicianId ? { 
                id: row.technicianId,
                name: row.technicianName,
                email: row.technicianEmail,
                phone: row.technicianPhone
            } : null
        }))

        return NextResponse.json({
            serviceOrders: formattedResults,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Erro ao listar ordens de serviço:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const parsed = createSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 })
        }

        const ctx = getRequestContext()
        const db = ctx.env.DB
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const data = parsed.data
        const createdById = (session.user as any).id

        // Generate orderNumber
        const year = new Date().getFullYear()
        const startOfYear = new Date(year, 0, 1).toISOString()
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
        
        const countResult: any = await db.prepare(`
            SELECT COUNT(*) as count FROM service_orders 
            WHERE openingDate >= ? AND openingDate <= ?
        `).bind(startOfYear, endOfYear).first()
        
        const countThisYear = countResult?.count || 0
        const orderNumber = `OS-${year}-${countThisYear + 1}`

        await db.prepare(`
            INSERT INTO service_orders (
                id, orderNumber, clientId, technicianId, equipmentType, brand, model, serialNumber, 
                reportedDefect, receivedAccessories, status, openingDate, createdById, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, orderNumber, data.clientId, data.technicianId || null, data.equipmentType, data.brand, data.model, data.serialNumber || null,
            data.reportedDefect, data.receivedAccessories || null, data.status, now, createdById, now, now
        ).run()

        const newOrder = await db.prepare('SELECT * FROM service_orders WHERE id = ?').bind(id).first()

        // Background tasks
        ctx.waitUntil((async () => {
            try {
                await NotificationService.createNewServiceOrderNotification(id)
            } catch (error) {
                console.error('Erro ao criar notificação:', error)
            }
            try {
                await ReceiptService.generateReceiptForDownload(id)
            } catch (error) {
                console.error('Erro ao gerar comprovante:', error)
            }
        })())
        
        return NextResponse.json(newOrder, { status: 201 })

    } catch (error) {
        console.error('Erro ao criar ordem de serviço:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
