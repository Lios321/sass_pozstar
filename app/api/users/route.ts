import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
<<<<<<< Updated upstream
import { hashPassword } from '@/lib/auth'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
=======
import { getDb } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth'
import { like, or, desc, count } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge';
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
=======
  const db = getDb()
  const whereClause = q
    ? or(
        like(users.name, `%${q}%`),
        like(users.email, `%${q}%`)
      )
    : undefined

  const [totalResult, usersData] = await Promise.all([
    db.select({ count: count() }).from(users).where(whereClause),
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize),
  ])
>>>>>>> Stashed changes

  const total = totalResult[0].count

  return NextResponse.json({
    data: usersData,
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

  const body = await request.json() as any
  const { name, email, password, role } = body || {}
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = getRequestContext().env.DB

  try {
    const db = getDb()
    const hashed = await hashPassword(password)
<<<<<<< Updated upstream
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
=======
    const id = uuidv4()
    
    const user = await db.insert(users).values({
      id,
      name,
      email,
      password: hashed,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })

    return NextResponse.json({ data: user[0] }, { status: 201 })
  } catch (e: any) {
    // Check for unique constraint violation (D1/SQLite error code for constraint violation is usually related to 'UNIQUE constraint failed')
    if (e.message?.includes('UNIQUE constraint failed') || e.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
>>>>>>> Stashed changes
    }
    console.error('Erro ao criar usuário:', e)
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
