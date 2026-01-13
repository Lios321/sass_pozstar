import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hashPassword } from '@/lib/auth'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  const offset = (page - 1) * pageSize

  const db = getRequestContext().env.DB
  
  let whereClause = ''
  let params: any[] = []

  if (q) {
    whereClause = 'WHERE name LIKE ? OR email LIKE ?'
    params = [`%${q}%`, `%${q}%`]
  }

  // Count
  const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`
  const totalResult: any = await db.prepare(countQuery).bind(...params).first()
  const total = totalResult?.count || 0

  // FindMany
  const query = `
    SELECT id, name, email, role, createdAt 
    FROM users 
    ${whereClause} 
    ORDER BY createdAt DESC 
    LIMIT ? OFFSET ?
  `
  const { results: users } = await db.prepare(query).bind(...params, pageSize, offset).all()

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, email, password, role } = body || {}
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = getRequestContext().env.DB

  try {
    const hashed = await hashPassword(password)
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.prepare(
      `INSERT INTO users (id, name, email, password, role, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, email, hashed, role, now, now).run()

    const user = { id, name, email, role, createdAt: now }
    
    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed') || e.message?.includes('users.email')) {
       return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
