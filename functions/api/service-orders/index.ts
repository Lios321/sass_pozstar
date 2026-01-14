import { getDb } from '@/functions/utils/db';
import { serviceOrders, clients, technicians } from '@/lib/db/schema';
import { desc, eq, and, or, like, count, sql } from 'drizzle-orm';
import { getSessionUser } from '@/functions/utils/auth';
import { z } from 'zod';
import { NotificationService } from '@/lib/notifications';
import { ReceiptService } from '@/lib/receipt-service';

const createSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  technicianId: z.string().optional(),
  equipmentType: z.string().min(1, 'Tipo de equipamento é obrigatório'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  serialNumber: z.string().optional(),
  reportedDefect: z.string().min(1, 'Defeito relatado é obrigatório'),
  receivedAccessories: z.string().optional(),
  status: z.string().optional().default('SEM_VER'),
});

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const { request, env } = context;
        const session = await getSessionUser(request, env);
        if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 });

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const search = url.searchParams.get('search') || '';
        const status = url.searchParams.get('status');
        const clientId = url.searchParams.get('clientId');
        const technicianId = url.searchParams.get('technicianId');
        
        const offset = (page - 1) * limit;
        const db = getDb(env);

        const conditions = [];

        if (search) {
            conditions.push(or(
                like(serviceOrders.equipmentType, `%${search}%`),
                like(serviceOrders.brand, `%${search}%`),
                like(serviceOrders.model, `%${search}%`),
                like(serviceOrders.serialNumber, `%${search}%`),
                like(serviceOrders.id, `%${search}%`)
            ));
        }
        if (status) {
            conditions.push(eq(serviceOrders.status, status));
        }
        if (clientId) {
            conditions.push(eq(serviceOrders.clientId, clientId));
        }
        if (technicianId) {
            conditions.push(eq(serviceOrders.technicianId, technicianId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [totalResult, results] = await Promise.all([
            db.select({ count: count() }).from(serviceOrders).where(whereClause),
            db.query.serviceOrders.findMany({
                where: whereClause,
                with: {
                    client: true,
                    technician: true
                },
                orderBy: [desc(serviceOrders.createdAt)],
                limit: limit,
                offset: offset
            })
        ]);

        const total = totalResult[0].count;

        return Response.json({
            serviceOrders: results,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao listar ordens de serviço:', error);
        return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { request, env } = context;
        const session = await getSessionUser(request, env);
        if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 });

        const body: any = await request.json();
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
            return Response.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 });
        }

        const db = getDb(env);
        const id = crypto.randomUUID();
        const now = new Date();
        const data = parsed.data;
        const createdById = (session.user as any).id;

        // Generate orderNumber
        const year = new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        
        const countResult = await db.select({ count: count() })
            .from(serviceOrders)
            .where(and(
                sql`${serviceOrders.openingDate} >= ${startOfYear}`,
                sql`${serviceOrders.openingDate} <= ${endOfYear}`
            ));
        
        const countThisYear = countResult[0]?.count || 0;
        const orderNumber = `OS-${year}-${countThisYear + 1}`;

        const [newOrder] = await db.insert(serviceOrders).values({
            id,
            orderNumber,
            clientId: data.clientId,
            technicianId: data.technicianId || null,
            equipmentType: data.equipmentType,
            brand: data.brand,
            model: data.model,
            serialNumber: data.serialNumber || null,
            reportedDefect: data.reportedDefect,
            receivedAccessories: data.receivedAccessories || null,
            status: data.status,
            openingDate: now,
            createdById,
            createdAt: now,
            updatedAt: now
        }).returning();

        // Background tasks
        try {
            context.waitUntil((async () => {
                try {
                    await NotificationService.createNewServiceOrderNotification(id, db);
                } catch (error) {
                    console.error('Erro ao criar notificação:', error);
                }
                try {
                    await ReceiptService.generateReceiptForDownload(id, db);
                } catch (error) {
                    console.error('Erro ao gerar comprovante:', error);
                }
            })());
        } catch (e) {
            console.warn("Could not access request context for waitUntil", e);
             try {
                await NotificationService.createNewServiceOrderNotification(id, db);
                await ReceiptService.generateReceiptForDownload(id, db);
             } catch (bgError) {
                 console.error('Erro em tarefas de fundo:', bgError);
             }
        }
        
        return Response.json(newOrder, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar ordem de serviço:', error);
        return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
