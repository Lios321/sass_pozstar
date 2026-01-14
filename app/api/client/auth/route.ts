import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
=======
import { getDb } from '@/lib/db/drizzle'
import { clients } from '@/lib/db/schema'
import { eq, like, desc, and } from 'drizzle-orm'
>>>>>>> Stashed changes
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

<<<<<<< Updated upstream
export const runtime = 'edge'
=======
export const runtime = 'edge';
>>>>>>> Stashed changes

const clientAuthSchema = z.object({
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos')
})

// POST /api/client/auth - Autenticar cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone } = clientAuthSchema.parse(body)
    const db = await getDb()

    // Normalizar telefone (remover caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '')
    const db = getRequestContext().env.DB

<<<<<<< Updated upstream
    // Buscar cliente pelo email e telefone (usando LIKE para os últimos 8 dígitos do telefone)
    // Prisma: phone: { contains: normalizedPhone.slice(-8) }
    const phoneSuffix = normalizedPhone.slice(-8)
    
    const client: any = await db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM service_orders WHERE clientId = c.id) as serviceOrdersCount
      FROM clients c
      WHERE lower(c.email) = lower(?) AND c.phone LIKE ?
      LIMIT 1
    `).bind(email, `%${phoneSuffix}%`).first()
=======
    // Buscar cliente pelo email e telefone
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.email, email.toLowerCase()),
        like(clients.phone, `%${normalizedPhone.slice(-8)}`)
      ),
      with: {
        serviceOrders: {
          orderBy: (serviceOrders, { desc }) => [desc(serviceOrders.createdAt)]
        }
      }
    })
>>>>>>> Stashed changes

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado. Verifique seu email e telefone.' },
        { status: 404 }
      )
    }

    // Retornar dados do cliente (sem informações sensíveis)
    const clientData = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      serviceOrdersCount: client.serviceOrdersCount || 0
    }

    return NextResponse.json({
      message: 'Autenticação realizada com sucesso',
      client: clientData
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro na autenticação do cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
