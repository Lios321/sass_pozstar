export const ServiceOrderStatusValues = [
  'SEM_VER', 'ORCAMENTAR', 'APROVADO', 'ESPERANDO_PECAS', 'COMPRADO',
  'MELHORAR', 'TERMINADO', 'SEM_PROBLEMA', 'SEM_CONSERTO', 'DEVOLVER',
  'DEVOLVIDO', 'DESCARTE'
] as const;

export type ServiceOrderStatus = typeof ServiceOrderStatusValues[number];
