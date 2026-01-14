import { NextRequest, NextResponse } from 'next/server'
<<<<<<< Updated upstream
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
=======
import { getDb } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge';
>>>>>>> Stashed changes

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
    const db = await getDb()

    const db = getRequestContext().env.DB

    // Verificar se usuário já existe
<<<<<<< Updated upstream
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
=======
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    })
>>>>>>> Stashed changes

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password)

    // Criar usuário
<<<<<<< Updated upstream
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
=======
    const [user] = await db.insert(users).values({
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: role as 'ADMIN' | 'TECHNICIAN',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    })
>>>>>>> Stashed changes

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
