import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const { token, password } = parsed.data
    const secret = process.env.JWT_SECRET || ''
    if (!secret) {
      return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
    }
    let payload: any
    try {
      payload = jwt.verify(token, secret)
    } catch {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 })
    }
    if (!payload || payload.purpose !== 'set_password' || !payload.email) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const db = getRequestContext().env.DB
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(String(payload.email)).first<any>()

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    const hashed = await hashPassword(password)
    
    await db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?')
      .bind(hashed, new Date().toISOString(), user.id)
      .run()

    return NextResponse.json({ message: 'Senha definida com sucesso' })
  } catch (error) {
    console.error('Erro ao definir senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

