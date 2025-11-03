import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const clientAuthSchema = z.object({
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos')
})

// POST /api/client/auth - Autenticar cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone } = clientAuthSchema.parse(body)

    // Normalizar telefone (remover caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '')

    // Buscar cliente pelo email e telefone
    const client = await prisma.client.findFirst({
      where: {
        email: email.toLowerCase(),
        phone: {
          contains: normalizedPhone.slice(-8) // Últimos 8 dígitos para flexibilidade
        }
      },
      include: {
        serviceOrders: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

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
      serviceOrdersCount: client.serviceOrders.length
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