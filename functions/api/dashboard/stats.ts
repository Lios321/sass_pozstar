import { getDb } from '@/functions/utils/db';
import { serviceOrders, clients, technicians } from '@/lib/db/schema';
import { eq, inArray, gte, count, desc, and } from 'drizzle-orm';
import { getSessionUser } from '@/functions/utils/auth';
import { ServiceOrderStatusValues } from '@/lib/types';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const { request, env } = context;
        const session = await getSessionUser(request, env);

        if (!session) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const url = new URL(request.url);
        const period = url.searchParams.get('period') || '30';
        const db = getDb(env);

        // Calculate dates
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        // const startDateStr = startDate.toISOString(); // Not used directly in Drizzle if using Date object

        // Total de clientes
        const totalClientsResult = await db.select({ count: count() }).from(clients);
        const totalClients = totalClientsResult[0]?.count || 0;

        // Total de técnicos
        const totalTechniciansResult = await db.select({ count: count() }).from(technicians);
        const totalTechnicians = totalTechniciansResult[0]?.count || 0;

        // Total de ordens de serviço
        const totalServiceOrdersResult = await db.select({ count: count() }).from(serviceOrders);
        const totalServiceOrders = totalServiceOrdersResult[0]?.count || 0;

        // Ordens pendentes
        const pendingOrdersResult = await db.select({ count: count() }).from(serviceOrders).where(inArray(serviceOrders.status, [
            ServiceOrderStatusValues.SEM_VER,
            ServiceOrderStatusValues.ORCAMENTAR,
            ServiceOrderStatusValues.APROVADO,
            ServiceOrderStatusValues.ESPERANDO_PECAS,
            ServiceOrderStatusValues.COMPRADO,
            ServiceOrderStatusValues.MELHORAR,
            ServiceOrderStatusValues.ESPERANDO_CLIENTE,
            ServiceOrderStatusValues.DEVOLVIDO,
        ]));
        const pendingOrders = pendingOrdersResult[0]?.count || 0;

        // Ordens concluídas no período
        const completedOrdersResult = await db.select({ count: count() }).from(serviceOrders).where(and(
            eq(serviceOrders.status, ServiceOrderStatusValues.TERMINADO),
            gte(serviceOrders.completionDate, startDate)
        ));
        const completedOrders = completedOrdersResult[0]?.count || 0;

        // Ordens recentes
        const recentOrders = await db.query.serviceOrders.findMany({
            limit: 10,
            orderBy: [desc(serviceOrders.createdAt)],
            with: {
                client: {
                    columns: { name: true }
                },
                technician: {
                    columns: { name: true }
                }
            }
        });

        // Distribuição por status
        const ordersByStatusResult = await db.select({
            status: serviceOrders.status,
            count: count()
        })
        .from(serviceOrders)
        .groupBy(serviceOrders.status);

        const ordersByStatus = ordersByStatusResult.map(item => ({
            status: item.status,
            _count: { status: item.count }
        }));

        // Performance dos técnicos
        const technicianPerformanceResult = await db.select({
            technicianId: serviceOrders.technicianId,
            count: count()
        })
        .from(serviceOrders)
        .where(and(
            eq(serviceOrders.status, ServiceOrderStatusValues.TERMINADO),
            gte(serviceOrders.completionDate, startDate)
        ))
        .groupBy(serviceOrders.technicianId);

        // Enrich technician names
        const technicianPerformance = await Promise.all(technicianPerformanceResult.map(async (item) => {
            if (!item.technicianId) return null;
            const tech = await db.query.technicians.findFirst({
                where: eq(technicians.id, item.technicianId),
                columns: { name: true }
            });
            return {
                name: tech?.name || 'Desconhecido',
                count: item.count
            };
        }));

        return Response.json({
            totalClients,
            totalTechnicians,
            totalServiceOrders,
            pendingOrders,
            completedOrders,
            recentOrders,
            ordersByStatus,
            technicianPerformance: technicianPerformance.filter(Boolean)
        });

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
