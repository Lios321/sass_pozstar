import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

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
    const user = await prisma.user.findUnique({ where: { email: String(payload.email) } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    const hashed = await hashPassword(password)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    })
    return NextResponse.json({ message: 'Senha definida com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

