import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number
  }
}

interface ReportFilters {
  startDate?: string
  endDate?: string
  status?: string
  equipmentType?: string
  technicianId?: string
  clientId?: string
}

interface ServiceOrder {
  id: string
  orderNumber: string
  clientId: string
  technicianId: string | null
  equipmentType: string
  brand: string
  model: string
  serialNumber: string | null
  status: 'PENDING' | 'IN_ANALYSIS' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'TESTING' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
  reportedDefect: string
  receivedAccessories: string | null
  budgetNote: string | null
  arrivalDate: string | null
  openingDate: string
  completionDate: string | null
  deliveryDate: string | null
  paymentDate: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string
    phone: string
  }
  technician: {
    id: string
    name: string
    email: string
    phone: string
  } | null
}

interface Technician {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
}

export interface ReportData {
  filters: ReportFilters
  stats: {
    total: number
    byStatus: Record<string, number>
    byEquipmentType: Record<string, number>
    averageCompletionTime: number | null
    totalRevenue: number
  }
  serviceOrders: ServiceOrder[]
  metadata: {
    technicians: Technician[]
    clients: Client[]
    generatedAt: string
    totalRecords: number
  }
}

export function generatePDFReport(data: ReportData): void {
  const doc = new jsPDF()
  
  // Título do relatório
  doc.setFontSize(20)
  doc.text('Relatório de Ordens de Serviço', 20, 20)
  
  // Informações do relatório
  doc.setFontSize(12)
  doc.text(`Gerado em: ${new Date(data.metadata.generatedAt).toLocaleString('pt-BR')}`, 20, 35)
  doc.text(`Total de registros: ${data.metadata.totalRecords}`, 20, 45)
  
  // Filtros aplicados
  let yPosition = 60
  doc.setFontSize(14)
  doc.text('Filtros Aplicados:', 20, yPosition)
  yPosition += 10
  
  doc.setFontSize(10)
  if (data.filters.startDate) {
    doc.text(`Data inicial: ${new Date(data.filters.startDate).toLocaleDateString('pt-BR')}`, 20, yPosition)
    yPosition += 8
  }
  if (data.filters.endDate) {
    doc.text(`Data final: ${new Date(data.filters.endDate).toLocaleDateString('pt-BR')}`, 20, yPosition)
    yPosition += 8
  }
  if (data.filters.status) {
    doc.text(`Status: ${getStatusLabel(data.filters.status)}`, 20, yPosition)
    yPosition += 8
  }
  if (data.filters.equipmentType) {
    doc.text(`Tipo de equipamento: ${data.filters.equipmentType}`, 20, yPosition)
    yPosition += 8
  }
  
  yPosition += 10
  
  // Estatísticas
  doc.setFontSize(14)
  doc.text('Estatísticas:', 20, yPosition)
  yPosition += 15
  
  // Tabela de estatísticas por status
  const statusData = Object.entries(data.stats.byStatus).map(([status, count]) => [
    getStatusLabel(status),
    count.toString()
  ])
  
  autoTable(doc, {
    head: [['Status', 'Quantidade']],
    body: statusData,
    startY: yPosition,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    margin: { left: 20 }
  })
  
  yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 20
  
  // Estatísticas gerais
  doc.setFontSize(12)
  doc.text(`Receita Total: R$ ${data.stats.totalRevenue.toFixed(2)}`, 20, yPosition)
  yPosition += 10
  
  if (data.stats.averageCompletionTime) {
    doc.text(`Tempo Médio de Conclusão: ${data.stats.averageCompletionTime} dias`, 20, yPosition)
    yPosition += 10
  }
  
  // Nova página para a tabela de ordens de serviço
  doc.addPage()
  
  // Tabela de ordens de serviço
  doc.setFontSize(14)
  doc.text('Ordens de Serviço:', 20, 20)
  
  const orderData = data.serviceOrders.map(order => [
    order.orderNumber,
    order.client?.name || 'N/A',
    order.equipmentType,
    `${order.brand} ${order.model}`,
    getStatusLabel(order.status),
    new Date(order.createdAt).toLocaleDateString('pt-BR'),
    order.technician?.name || 'Não atribuído'
  ])
  
  autoTable(doc, {
    head: [['Nº Ordem', 'Cliente', 'Equipamento', 'Marca/Modelo', 'Status', 'Data Criação', 'Técnico']],
    body: orderData,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 30 }
    }
  })
  
  // Salvar o PDF
  doc.save(`relatorio-ordens-servico-${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateExcelReport(data: ReportData): void {
  // Criar workbook
  const wb = XLSX.utils.book_new()
  
  // Aba 1: Resumo
  const summaryData = [
    ['Relatório de Ordens de Serviço'],
    [''],
    ['Gerado em:', new Date(data.metadata.generatedAt).toLocaleString('pt-BR')],
    ['Total de registros:', data.metadata.totalRecords],
    [''],
    ['Filtros Aplicados:'],
    ['Data inicial:', data.filters.startDate ? new Date(data.filters.startDate).toLocaleDateString('pt-BR') : 'N/A'],
    ['Data final:', data.filters.endDate ? new Date(data.filters.endDate).toLocaleDateString('pt-BR') : 'N/A'],
    ['Status:', data.filters.status ? getStatusLabel(data.filters.status) : 'Todos'],
    ['Tipo de equipamento:', data.filters.equipmentType || 'Todos'],
    [''],
    ['Estatísticas:'],
    ['Receita Total:', `R$ ${data.stats.totalRevenue.toFixed(2)}`],
    ['Tempo Médio de Conclusão:', data.stats.averageCompletionTime ? `${data.stats.averageCompletionTime} dias` : 'N/A'],
    [''],
    ['Distribuição por Status:'],
    ...Object.entries(data.stats.byStatus).map(([status, count]) => [getStatusLabel(status), count])
  ]
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo')
  
  // Aba 2: Ordens de Serviço
  const ordersData = [
    ['Nº Ordem', 'Cliente', 'Email Cliente', 'Telefone', 'Equipamento', 'Marca', 'Modelo', 'Número Série', 'Status', 'Defeito Relatado', 'Data Criação', 'Data Abertura', 'Data Conclusão', 'Data Entrega', 'Técnico', 'Observações']
  ]
  
  data.serviceOrders.forEach(order => {
    ordersData.push([
      order.orderNumber,
      order.client?.name || 'N/A',
      order.client?.email || 'N/A',
      order.client?.phone || 'N/A',
      order.equipmentType,
      order.brand,
      order.model,
      order.serialNumber || 'N/A',
      getStatusLabel(order.status),
      order.reportedDefect,
      new Date(order.createdAt).toLocaleDateString('pt-BR'),
      order.openingDate ? new Date(order.openingDate).toLocaleDateString('pt-BR') : 'N/A',
      order.completionDate ? new Date(order.completionDate).toLocaleDateString('pt-BR') : 'N/A',
      order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : 'N/A',
      order.technician?.name || 'Não atribuído',
      order.budgetNote || 'N/A'
    ])
  })
  
  const ordersWs = XLSX.utils.aoa_to_sheet(ordersData)
  XLSX.utils.book_append_sheet(wb, ordersWs, 'Ordens de Serviço')
  
  // Aba 3: Estatísticas por Equipamento
  const equipmentData = [
    ['Tipo de Equipamento', 'Quantidade'],
    ...Object.entries(data.stats.byEquipmentType).map(([type, count]) => [type, count])
  ]
  
  const equipmentWs = XLSX.utils.aoa_to_sheet(equipmentData)
  XLSX.utils.book_append_sheet(wb, equipmentWs, 'Por Equipamento')
  
  // Salvar o arquivo
  XLSX.writeFile(wb, `relatorio-ordens-servico-${new Date().toISOString().split('T')[0]}.xlsx`)
}

function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'PENDING': 'Sem ver',
    'IN_ANALYSIS': 'Em Análise',
    'APPROVED': 'Aprovada',
    'IN_PROGRESS': 'Em Execução',
    'WAITING_PARTS': 'Aguardando Peças',
    'TESTING': 'Em Testes',
    'COMPLETED': 'Concluída',
    'DELIVERED': 'Entregue',
    'CANCELLED': 'Cancelada'
  }
  return statusLabels[status] || status
}