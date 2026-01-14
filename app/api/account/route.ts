import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
<<<<<<< Updated upstream
=======
import { getDb } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
>>>>>>> Stashed changes
import { hashPassword } from '@/lib/auth'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export const runtime = 'edge';

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

<<<<<<< Updated upstream
  const db = getRequestContext().env.DB

  const user = await db.prepare(
    'SELECT id, name, email, role, createdAt FROM users WHERE id = ?'
  ).bind(userId).first()
=======
  const db = await getDb()
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true, role: true, createdAt: true },
  })
>>>>>>> Stashed changes

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ data: user })
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const body: any = await request.json()
  const { name, email, password } = body || {}
<<<<<<< Updated upstream
  
  const db = getRequestContext().env.DB

  try {
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
    if (password) {
      updates.push('password = ?')
      values.push(await hashPassword(password))
    }

    if (updates.length > 0) {
      const now = new Date().toISOString()
      updates.push('updatedAt = ?')
      values.push(now)
      values.push(userId)

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      await db.prepare(query).bind(...values).run()
    }

    const user = await db.prepare(
      'SELECT id, name, email, role, createdAt FROM users WHERE id = ?'
    ).bind(userId).first()
    
    return NextResponse.json({ data: user })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed') || e.message?.includes('users.email')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
=======
  const data: any = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) data.password = await hashPassword(password)
  
  if (Object.keys(data).length > 0) {
    data.updatedAt = new Date()
  }

  try {
    const db = await getDb()
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      
    return NextResponse.json({ data: user })
  } catch (e: any) {
    // Check for D1 unique constraint error
    // Error handling in D1/Drizzle is a bit different than Prisma
    if (e.message?.includes('UNIQUE constraint failed') || e.cause?.message?.includes('UNIQUE constraint failed')) {
       return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
>>>>>>> Stashed changes
    }
    console.error('Erro ao atualizar perfil:', e)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}
