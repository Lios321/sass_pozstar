import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'

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
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        serviceOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { serviceOrders: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })

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

    // Verificar se cliente existe
    const existingClient = await prisma.client.findUnique({
      where: { id }
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflitos de email/documento se estão sendo atualizados
    if (updateData.email || updateData.document) {
      const conflictClient = await prisma.client.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateData.email ? { email: updateData.email } : {},
                updateData.document ? { document: updateData.document } : {}
              ].filter(condition => Object.keys(condition).length > 0)
            }
          ]
        }
      })

      if (conflictClient) {
        return NextResponse.json(
          { error: 'Já existe outro cliente com este email ou documento' },
          { status: 400 }
        )
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      message: 'Cliente atualizado com sucesso',
      client
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

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    // Verificar se cliente existe
    const existingClient = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { serviceOrders: true }
        }
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se cliente tem ordens de serviço
    if (existingClient._count.serviceOrders > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar cliente com ordens de serviço' },
        { status: 400 }
      )
    }

    await prisma.client.delete({
      where: { id }
    })

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