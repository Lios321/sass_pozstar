import { getDbFromEnv } from '../../../lib/db/drizzle-functions'
import { users } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../../../lib/auth-core'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'TECHNICIAN']).optional().default('TECHNICIAN')
})

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json()
    const { name, email, password, role } = registerSchema.parse(body)
    const db = getDbFromEnv(context.env)

    // Verificar se usuário já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    })

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Usuário já existe com este email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password)

    // Criar usuário
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

    return new Response(JSON.stringify({
      message: 'Usuário criado com sucesso',
      user
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Dados inválidos', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.error('Erro ao registrar usuário:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
