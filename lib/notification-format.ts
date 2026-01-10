export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'STATUS_UPDATE'

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pendente',
    IN_ANALYSIS: 'Em análise',
    APPROVED: 'Aprovada',
    IN_PROGRESS: 'Em execução',
    WAITING_PARTS: 'Aguardando peças',
    TESTING: 'Em testes',
    COMPLETED: 'Concluída',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelada',
  }
  return map[status] || status
}

export function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'SUCCESS':
      return 'Sucesso'
    case 'WARNING':
      return 'Aviso'
    case 'ERROR':
      return 'Erro'
    case 'STATUS_UPDATE':
      return 'Atualização'
    default:
      return 'Informação'
  }
}

export function buildStatusUpdateTitle(orderNumber?: string): string {
  return orderNumber ? `OS #${orderNumber} — Status atualizado` : 'Status atualizado'
}

export function buildStatusUpdateMessage(oldStatus: string, newStatus: string): string {
  return `Status alterado de ${getStatusText(oldStatus)} para ${getStatusText(newStatus)}`
}

export function buildNewOsTitle(orderNumber?: string): string {
  return orderNumber ? `Nova OS #${orderNumber}` : 'Nova OS'
}

export function buildNewOsMessage(brand?: string, model?: string): string {
  const equip = [brand, model].filter(Boolean).join(' ')
  return equip
    ? `Sua ordem de serviço foi criada. Equipamento: ${equip}`
    : 'Sua ordem de serviço foi criada.'
}

export function buildTechnicianAssignedTitle(orderNumber?: string): string {
  return orderNumber ? `Técnico atribuído — OS #${orderNumber}` : 'Técnico atribuído'
}

export function buildTechnicianAssignedMessage(technicianName?: string): string {
  return technicianName
    ? `O técnico ${technicianName} foi atribuído à sua ordem de serviço`
    : 'Um técnico foi atribuído à sua ordem de serviço'
}

export function formatRelative(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hour = Math.floor(min / 60)
  const day = Math.floor(hour / 24)

  if (sec < 30) return 'agora'
  if (min < 1) return `há ${sec}s`
  if (hour < 1) return `há ${min} min`
  if (day < 1) return `há ${hour} h`
  if (day === 1) return 'ontem'
  return date.toLocaleDateString('pt-BR')
}

