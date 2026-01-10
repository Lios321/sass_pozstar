import { z } from 'zod'

/**
 * Schema de criação/atualização de Ordem de Serviço
 */
export const serviceOrderSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  technicianId: z.string().optional(),
  equipmentType: z.string().min(2, 'Tipo de equipamento é obrigatório'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  reportedDefect: z.string().min(5, 'Defeito relatado deve ter pelo menos 5 caracteres'),
  receivedAccessories: z.string().optional(),
  budgetNote: z.string().optional(),
  technicalExplanation: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  budgetItems: z.any().optional(),
  arrivalDate: z.string().min(1, 'Data de chegada é obrigatória'),
  openingDate: z.string().optional(),
  completionDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  paymentDate: z.string().optional()
})
