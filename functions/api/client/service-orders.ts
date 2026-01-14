import { getDb } from '@/functions/utils/db';
import { serviceOrders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const clientId = url.searchParams.get('clientId');
    const db = getDb(context.env);

    if (!clientId) {
      return Response.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    }

    const serviceOrdersResult = await db.query.serviceOrders.findMany({
      where: eq(serviceOrders.clientId, clientId),
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        technician: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specializations: true,
          },
        },
      },
      orderBy: [desc(serviceOrders.createdAt)],
    });

    const formattedOrders = serviceOrdersResult.map((order) => ({
      id: order.id,
      serviceOrderNumber: order.orderNumber,
      equipmentType: order.equipmentType,
      brand: order.brand,
      model: order.model,
      reportedDefect: order.reportedDefect,
      status: order.status,
      serialNumber: order.serialNumber,
      receivedAccessories: order.receivedAccessories,
      budgetNote: order.budgetNote,
      arrivalDate: order.arrivalDate,
      openingDate: order.openingDate,
      completionDate: order.completionDate,
      deliveryDate: order.deliveryDate,
      paymentDate: order.paymentDate,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      technician: order.technician
        ? {
            name: order.technician.name,
            specializations: order.technician.specializations,
          }
        : null,
      progress: getProgressByStatus(String(order.status)),
    }));

    return Response.json({
      serviceOrders: formattedOrders,
      total: formattedOrders.length,
    });
  } catch (error) {
    console.error('Erro ao buscar ordens de serviço do cliente:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

function getProgressByStatus(status: string): number {
  const statusProgress: { [key: string]: number } = {
    SEM_VER: 10,
    PENDING: 10,
    IN_ANALYSIS: 25,
    ORCAMENTAR: 25,
    APPROVED: 40,
    APROVADO: 40,
    IN_PROGRESS: 60,
    ESPERANDO_PECAS: 60,
    WAITING_PARTS: 70,
    TESTING: 85,
    MELHORAR: 85,
    COMPLETED: 100,
    TERMINADO: 100,
    DEVOLVER: 100,
    DEVOLVIDO: 100,
    DESCARTE: 100,
  };

  return statusProgress[status] || 0;
}

