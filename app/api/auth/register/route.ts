import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'TECHNICIAN']).optional().default('TECHNICIAN')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = registerSchema.parse(body)

    const db = getRequestContext().env.DB

    // Verificar se usuário já existe
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password)

    // Criar usuário
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    
    // Assumindo que a tabela users tem colunas: id, email, name, password, role, createdAt, updatedAt
    await db.prepare(
      `INSERT INTO users (id, email, name, password, role, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, email, name, hashedPassword, role, now, now).run()

    const user = {
      id,
      name,
      email,
      role,
      createdAt: now
    }

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
