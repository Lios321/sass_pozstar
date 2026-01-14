import { getDb } from '@/functions/utils/db';
import { ReceiptService } from '@/lib/receipt-service';
import { getSessionUser } from '@/functions/utils/auth';
import { serviceOrders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const { request, env, params } = context;
        const session = await getSessionUser(request, env);
        if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 });

        const id = params.id as string;
        const db = getDb(env);

        // First get the service order to find the client ID
        const order = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, id),
            columns: { clientId: true }
        });

        if (!order || !order.clientId) {
            // If no order or no client, return empty history or error?
            // Original code returned empty list if clientId not found (implicitly)
            return Response.json({
                serviceOrderId: id,
                deliveries: [],
            });
        }

        const history = await ReceiptService.getDeliveryHistory(order.clientId);

        return Response.json({
            serviceOrderId: id,
            deliveries: history,
        });

    } catch (error) {
        console.error('Erro ao buscar histórico de entregas:', error);
        return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
