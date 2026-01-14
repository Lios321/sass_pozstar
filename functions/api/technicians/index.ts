import { getDb } from '../../utils/db';
import { getSessionUser } from '../../utils/auth';
import { technicians, users, serviceOrders } from '@/lib/db/schema';
import { eq, or, and, desc, count, sql, like } from 'drizzle-orm';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth-core';
import jwt from 'jsonwebtoken';
import { EmailService } from '@/lib/email-service';
import { inviteTemplate } from '@/lib/email-templates';
import { v4 as uuidv4 } from 'uuid';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  isAvailable: z.boolean().optional(),
  specializations: z
    .union([z.array(z.string()), z.string()])
    .optional(),
})

function normalizeSpecializations(input: string | string[] | undefined): string[] {
  if (input === undefined) return []
  if (Array.isArray(input)) return input.map(String)
  const s = String(input)
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {}
  return s
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const { request, env } = context;
    const session = await getSessionUser(request, env);
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const available = searchParams.get('available');

    const skip = (page - 1) * limit;
    const db = getDb(env);

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(technicians.name, `%${search}%`),
          like(technicians.email, `%${search}%`),
          like(technicians.phone, `%${search}%`)
        )
      );
    }

    if (available !== null && available !== undefined) {
      conditions.push(eq(technicians.isAvailable, available === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [techniciansData, totalResult] = await Promise.all([
      db.select({
        id: technicians.id,
        name: technicians.name,
        email: technicians.email,
        phone: technicians.phone,
        specializations: technicians.specializations,
        isAvailable: technicians.isAvailable,
        createdAt: technicians.createdAt,
        updatedAt: technicians.updatedAt,
        serviceOrdersCount: sql<number>`(SELECT COUNT(*) FROM ${serviceOrders} WHERE ${serviceOrders.technicianId} = ${technicians.id})`
      })
      .from(technicians)
      .where(whereClause)
      .limit(limit)
      .offset(skip)
      .orderBy(desc(technicians.createdAt)),
      db.select({ count: count() }).from(technicians).where(whereClause)
    ]);

    const total = totalResult[0]?.count || 0;

    const techniciansParsed = techniciansData.map((tech) => ({
      ...tech,
      isAvailable: !!tech.isAvailable,
      specializations: tech.specializations ? JSON.parse(tech.specializations) : [],
      _count: {
        serviceOrders: tech.serviceOrdersCount
      }
    }));

    return Response.json({
      technicians: techniciansParsed,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar técnicos:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { request, env } = context;
    const session = await getSessionUser(request, env);
    if (!session || (session as any)?.role !== 'ADMIN') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { name, email, phone } = parsed.data;
    const specializations = normalizeSpecializations(parsed.data.specializations);
    const isAvailable = typeof parsed.data.isAvailable === 'boolean' ? parsed.data.isAvailable : true;

    const db = getDb(env);

    const [existingTechnician] = await db.select()
      .from(technicians)
      .where(eq(technicians.email, email));

    if (existingTechnician) {
      return Response.json(
        { error: 'Técnico já existe com este email' },
        { status: 400 }
      );
    }

    const technicianId = uuidv4();
    const [technician] = await db.insert(technicians)
      .values({
        id: technicianId,
        name,
        email,
        phone,
        isAvailable,
        specializations: JSON.stringify(specializations),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.email, email));

    if (!existingUser) {
      const tempPassword = Math.random().toString(36).slice(-12);
      const hashed = await hashPassword(tempPassword);
      await db.insert(users).values({
        id: uuidv4(),
        name,
        email,
        password: hashed,
        role: 'TECHNICIAN',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    let inviteLink: string | null = null;
    let emailPreview: string | null = null;
    try {
       const origin = new URL(request.url).origin;
       const baseCandidate =
         (env as any).SITE_URL || origin || (env as any).NEXTAUTH_URL || 'http://localhost:3000';
       const base = (() => {
        const withScheme = /^https?:\/\//.test(baseCandidate) ? baseCandidate : `http://${baseCandidate}`;
        try {
          const u = new URL(withScheme);
          if (['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname)) {
            u.protocol = 'http:';
          }
          return `${u.protocol}//${u.host}`;
        } catch {
          return withScheme;
        }
      })();
      const secret = (env as any).JWT_SECRET || '';
      if (secret) {
        const token = jwt.sign(
          { email, purpose: 'set_password' },
          secret,
          { expiresIn: '48h' }
        );
        inviteLink = `${base}/auth/definir-senha?token=${encodeURIComponent(token)}`;
        const html = inviteTemplate(name, { label: 'Definir senha', url: inviteLink });
        const result = await EmailService.sendEmail({
          to: email,
          subject: 'Seu acesso ao Pozstar - Defina sua senha',
          html
        });
        if (result.previewUrl) {
          emailPreview = result.previewUrl;
        }
      }
    } catch (e) {
        console.error("Email error", e);
    }

    return Response.json(
      {
        message: 'Técnico criado com sucesso',
        technician: {
          ...technician,
          isAvailable: !!technician.isAvailable,
          specializations: JSON.parse(technician.specializations || '[]')
        },
        inviteLink,
        emailPreview
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Erro ao criar técnico:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
