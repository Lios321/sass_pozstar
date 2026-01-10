import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ data: user })
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const body = await request.json()
  const { name, email, password } = body || {}
  const data: any = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) data.password = await hashPassword(password)

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json({ data: user })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}

