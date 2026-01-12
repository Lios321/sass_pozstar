import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  document: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres'),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos'),
  complement: z.string().optional(),
  country: z.string().min(2, 'País deve ter pelo menos 2 caracteres'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  clientType: z.string().min(1, 'Tipo de Cliente é obrigatório')
})

// GET - Listar clientes
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

    const skip = (page - 1) * limit

    const where = search ? {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { document: { contains: search } }
      ]
    } : {}

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { serviceOrders: true }
          }
        }
      }),
      prisma.client.count({ where })
    ])

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar cliente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      email, 
      phone, 
      address, 
      document, 
      city, 
      state, 
      zipCode, 
      complement, 
      country, 
      latitude, 
      longitude,
      clientType 
    } = clientSchema.parse(body)

    // Verificar se cliente já existe
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { email },
          { document }
        ]
      }
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Cliente já existe com este email ou documento' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        document,
        city,
        state,
        zipCode,
        complement,
        country,
        latitude,
        longitude,
        clientType
      }
    })

    return NextResponse.json({
      message: 'Cliente criado com sucesso',
      client
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar cliente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
