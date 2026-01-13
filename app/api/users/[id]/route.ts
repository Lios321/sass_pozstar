import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hashPassword } from '@/lib/auth'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, email, role, password } = body || {}
  
  const db = getRequestContext().env.DB
  
  try {
    const { id } = await params
    
    // Check if user exists
    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
    if (!existing) {
       return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const updates: string[] = []
    const values: any[] = []

    if (name) {
      updates.push('name = ?')
      values.push(name)
    }
    if (email) {
      updates.push('email = ?')
      values.push(email)
    }
    if (role) {
      updates.push('role = ?')
      values.push(role)
    }
    if (password) {
      updates.push('password = ?')
      values.push(await hashPassword(password))
    }

    if (updates.length > 0) {
      const now = new Date().toISOString()
      updates.push('updatedAt = ?')
      values.push(now)
      values.push(id) // for WHERE clause

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      await db.prepare(query).bind(...values).run()
    }
    
    const user = await db.prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?').bind(id).first()
    return NextResponse.json({ data: user })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed') || e.message?.includes('users.email')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getRequestContext().env.DB

  try {
    const { id } = await params
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao remover usuário' }, { status: 500 })
  }
}
