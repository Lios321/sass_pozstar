import { NextRequest } from 'next/server'
import { serviceOrdersController } from '@/server/controllers/serviceOrdersController'

/**
 * GET /api/service-orders
 * Lista ordens de serviço paginadas e filtradas
 * @param request Objeto da requisição (query params: page, limit, search, sortField, sortDirection, status, clientId, technicianId)
 * @returns JSON com lista e paginação
 */
export async function GET(request: NextRequest) {
  return serviceOrdersController.list(request)
}

/**
 * POST /api/service-orders
 * Cria uma nova ordem de serviço
 * @param request Objeto da requisição contendo o JSON do corpo
 * @returns JSON com mensagem de sucesso e a OS criada
 */
export async function POST(request: NextRequest) {
  return serviceOrdersController.create(request)
}
