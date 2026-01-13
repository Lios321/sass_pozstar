import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const clientUpdateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional(),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').optional(),
  document: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres').optional(),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres').optional(),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres').optional(),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos').optional(),
  complement: z.string().optional(),
  country: z.string().min(2, 'País deve ter pelo menos 2 caracteres').optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  clientType: z.string().min(1, 'Tipo de Cliente é obrigatório').optional()
})

// GET - Buscar cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const db = getRequestContext().env.DB

    // Get client
    const client: any = await db.prepare(
        `SELECT *, (SELECT COUNT(*) FROM service_orders WHERE clientId = clients.id) as serviceOrdersCount FROM clients WHERE id = ?`
    ).bind(id).first()

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Get service orders
    const { results: serviceOrders } = await db.prepare(
        `SELECT * FROM service_orders WHERE clientId = ? ORDER BY createdAt DESC LIMIT 10`
    ).bind(id).all()

    const formattedClient = {
        ...client,
        serviceOrders,
        _count: {
            serviceOrders: client.serviceOrdersCount
        }
    }
    // Remove temporary field if needed
    delete formattedClient.serviceOrdersCount

    return NextResponse.json({ client: formattedClient })

  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const updateData = clientUpdateSchema.parse(body)
    const db = getRequestContext().env.DB

    // Verificar se cliente existe
    const existingClient: any = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(id).first()

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflitos de email/documento
    if (updateData.email || updateData.document) {
        let conflictQuery = 'SELECT id FROM clients WHERE id != ? AND ('
        let conflictParams: any[] = [id]
        let conditions = []
        if (updateData.email) {
            conditions.push('email = ?')
            conflictParams.push(updateData.email)
        }
        if (updateData.document) {
            conditions.push('document = ?')
            conflictParams.push(updateData.document)
        }
        conflictQuery += conditions.join(' OR ') + ')'
        
        const conflictClient = await db.prepare(conflictQuery).bind(...conflictParams).first()

      if (conflictClient) {
        return NextResponse.json(
          { error: 'Já existe outro cliente com este email ou documento' },
          { status: 400 }
        )
      }
    }

    // Construct Update Query
    const keys = Object.keys(updateData)
    if (keys.length > 0) {
        const setClause = keys.map(key => `${key} = ?`).join(', ')
        const values = Object.values(updateData)
        // Add updatedAt
        const finalSetClause = setClause + ', updatedAt = ?'
        const finalValues = [...values, new Date().toISOString(), id]
        
        await db.prepare(`UPDATE clients SET ${finalSetClause} WHERE id = ?`)
            .bind(...finalValues)
            .run()
    }

    // Fetch updated client
    const updatedClient = await db.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()

    return NextResponse.json({
      message: 'Cliente atualizado com sucesso',
      client: updatedClient
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const db = getRequestContext().env.DB

    // Verificar se cliente existe e contar ordens
    const client: any = await db.prepare(
        `SELECT id, (SELECT COUNT(*) FROM service_orders WHERE clientId = clients.id) as serviceOrdersCount FROM clients WHERE id = ?`
    ).bind(id).first()

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se cliente tem ordens de serviço
    if (client.serviceOrdersCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar cliente com ordens de serviço' },
        { status: 400 }
      )
    }

    await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run()

    return NextResponse.json({
      message: 'Cliente deletado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
