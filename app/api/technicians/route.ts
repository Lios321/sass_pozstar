import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken, getTokenFromRequest } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// Interfaces para tipos de dados
// Removido TechnicianWhereClause customizado; vamos usar o tipo oficial do Prisma

interface TechnicianFromDB {
  id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const technicianSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  specializations: z.array(z.string()).optional().default([])
})

// GET - Listar técnicos
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
    const available = searchParams.get('available')

    const skip = (page - 1) * limit

    const where: Prisma.TechnicianWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ]
    }

    if (available !== null && available !== undefined) {
      where.isAvailable = available === 'true'
    }

    const [technicians, total] = await Promise.all([
      prisma.technician.findMany({
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
      prisma.technician.count({ where })
    ])

    // Parse specializations JSON
    const techniciansParsed = technicians.map((tech: TechnicianFromDB) => ({
      ...tech,
      specializations: tech.specializations ? JSON.parse(tech.specializations) : []
    }))

    return NextResponse.json({
      technicians: techniciansParsed,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar técnicos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar técnico
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, specializations } = technicianSchema.parse(body)

    // Verificar se técnico já existe
    const existingTechnician = await prisma.technician.findUnique({
      where: { email }
    })

    if (existingTechnician) {
      return NextResponse.json(
        { error: 'Técnico já existe com este email' },
        { status: 400 }
      )
    }

    const technician = await prisma.technician.create({
      data: {
        name,
        email,
        phone,
        specializations: JSON.stringify(specializations)
      }
    })

    return NextResponse.json({
      message: 'Técnico criado com sucesso',
      technician: {
        ...technician,
        specializations
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar técnico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}