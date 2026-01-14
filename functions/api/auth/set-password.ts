import { getDbFromEnv } from '../../../lib/db/drizzle-functions'
import { users } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../../../lib/auth-core'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
})

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { token, password } = parsed.data
    const secret = ((context.env as any).JWT_SECRET as string) || process.env.JWT_SECRET || ''
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Configuração ausente' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    let payload: any
    try {
      payload = jwt.verify(token, secret)
    } catch {
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (!payload || payload.purpose !== 'set_password' || !payload.email) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    
    const db = getDbFromEnv(context.env)
    const user = await db.query.users.findFirst({ where: eq(users.email, String(payload.email)) })
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }
    const hashed = await hashPassword(password)
    await db.update(users)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      
    return new Response(JSON.stringify({ message: 'Senha definida com sucesso' }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Erro ao definir senha:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
