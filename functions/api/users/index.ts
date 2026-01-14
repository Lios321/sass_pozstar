import { getDb } from '../../utils/db';
import { getSessionUser } from '../../utils/auth';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth-core';
import { like, or, desc, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const { request, env } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    
    const db = getDb(env);
    const whereClause = q
      ? or(
          like(users.name, `%${q}%`),
          like(users.email, `%${q}%`)
        )
      : undefined;

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
    ]);

    const total = totalResult[0].count;

    return Response.json({
      data: usersData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { request, env } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { name, email, password, role } = body || {};
    if (!name || !email || !password || !role) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const db = getDb(env);
    const hashed = await hashPassword(password);
    const id = uuidv4();
    
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
    });

    return Response.json({ data: user[0] }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed') || e.code === 'SQLITE_CONSTRAINT') {
      return Response.json({ error: 'Email já cadastrado' }, { status: 409 });
    }
    console.error('Erro ao criar usuário:', e);
    return Response.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
