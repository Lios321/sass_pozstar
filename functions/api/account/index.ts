import { getDb } from '../../utils/db';
import { getSessionUser } from '../../utils/auth';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;
  const session = await getSessionUser(request, env);
  
  if (!session || !(session as any)?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session as any).id as string;

  const db = getDb(env);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  return Response.json({ data: user });
}
