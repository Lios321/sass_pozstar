import { getDb } from '../../utils/db';
import { getSessionUser } from '../../utils/auth';
import { technicians, serviceOrders } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  isAvailable: z.boolean().optional(),
  specializations: z
    .union([
      z.array(z.string()),
      z.string(),
    ])
    .optional(),
})

function normalizeSpecializations(input: string | string[] | undefined): string[] | undefined {
  if (input === undefined) return undefined
  if (Array.isArray(input)) return input
  const s = String(input)
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? parsed.map(String) : undefined
  } catch {}
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export const onRequestPut: PagesFunction = async (context) => {
  try {
    const { request, env, params } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 });
    }
    
    const id = params.id as string;
    const db = getDb(env);

    const data: any = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.email) data.email = parsed.data.email;
    if (parsed.data.phone) data.phone = parsed.data.phone;
    if (typeof parsed.data.isAvailable === 'boolean') data.isAvailable = parsed.data.isAvailable ? 1 : 0;
    
    const specs = normalizeSpecializations(parsed.data.specializations);
    if (specs !== undefined) data.specializations = JSON.stringify(specs);

    data.updatedAt = new Date();

    const [tech] = await db.update(technicians)
      .set(data)
      .where(eq(technicians.id, id))
      .returning({
        id: technicians.id,
        name: technicians.name,
        email: technicians.email,
        phone: technicians.phone,
        isAvailable: technicians.isAvailable,
        specializations: technicians.specializations,
        createdAt: technicians.createdAt,
      });

    if (!tech) {
        return Response.json({ error: 'Técnico não encontrado' }, { status: 404 });
    }

    return Response.json({
      technician: {
        ...tech,
        isAvailable: !!tech.isAvailable,
        specializations: tech.specializations ? JSON.parse(tech.specializations) : [],
      },
    });
  } catch (e) {
    console.error('Erro ao atualizar técnico:', e);
    return Response.json({ error: 'Erro ao atualizar técnico' }, { status: 500 });
  }
}

export const onRequestDelete: PagesFunction = async (context) => {
  try {
    const { request, env, params } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const id = params.id as string;
    const db = getDb(env);

    const [existing] = await db.select({
      id: technicians.id,
      serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.technicianId} = ${technicians.id})`
    })
    .from(technicians)
    .where(eq(technicians.id, id));

    if (!existing) {
      return Response.json({ error: 'Técnico não encontrado' }, { status: 404 });
    }
    if (Number(existing.serviceOrdersCount) > 0) {
      return Response.json(
        { error: 'Não é possível deletar técnico com ordens de serviço vinculadas' },
        { status: 400 }
      );
    }

    await db.delete(technicians).where(eq(technicians.id, id));
    return Response.json({ message: 'Técnico removido com sucesso' });
  } catch (e) {
    console.error('Erro ao remover técnico:', e);
    return Response.json({ error: 'Erro ao remover técnico' }, { status: 500 });
  }
}
