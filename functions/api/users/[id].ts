import { getDb } from '../../utils/db';
import { getSessionUser } from '../../utils/auth';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth-core';
import { eq } from 'drizzle-orm';

export const onRequestPut: PagesFunction = async (context) => {
  try {
    const { request, env, params } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { name, email, role, password } = body || {};

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (password) data.password = await hashPassword(password);
    
    data.updatedAt = new Date();

    const id = params.id as string;
    const db = getDb(env);
    const user = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });
    return Response.json({ data: user[0] });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed') || e.code === 'SQLITE_CONSTRAINT') {
      return Response.json({ error: 'Email já cadastrado' }, { status: 409 });
    }
    console.error('Erro ao atualizar usuário:', e);
    return Response.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

export const onRequestDelete: PagesFunction = async (context) => {
  try {
    const { request, env, params } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id as string;
    const db = getDb(env);
    await db.delete(users).where(eq(users.id, id));
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('Erro ao remover usuário:', e);
    return Response.json({ error: 'Erro ao remover usuário' }, { status: 500 });
  }
}
