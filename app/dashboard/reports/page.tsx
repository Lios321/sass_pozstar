'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { generatePDFReport, generateExcelReport, type ReportData } from '@/lib/report-generators'

interface ReportFilters {
  startDate: string
  endDate: string
  status: string
  technicianId: string
  clientId: string
  equipmentType: string
}

interface Technician {
  id: string
  name: string
  email: string
}

interface Client {
  id: string
  name: string
  email: string
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    status: 'ALL',
    technicianId: 'ALL',
    clientId: 'ALL',
    equipmentType: ''
  })
  
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/reports')
      if (response.ok) {
        const data: any = await response.json()
        setReportData(data)
        setTechnicians(data.metadata.technicians)
        setClients(data.metadata.clients)
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL') {
          params.append(key, value)
        }
      })
      
      const response = await fetch(`/api/reports?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Erro ao gerar relatório')
      }
      
      const data: any = await response.json()
      setReportData(data)
    } catch (error) {
      setError('Erro ao gerar relatório. Tente novamente.')
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    if (reportData) {
      generatePDFReport(reportData)
    }
  }

  const downloadExcel = () => {
    if (reportData) {
      generateExcelReport(reportData)
    }
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      technicianId: '',
      clientId: '',
      equipmentType: ''
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados das ordens de serviço
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>
            Configure os filtros para personalizar seu relatório
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="PENDING">Sem ver</SelectItem>
                  <SelectItem value="IN_ANALYSIS">Em Análise</SelectItem>
                  <SelectItem value="APPROVED">Aprovada</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Execução</SelectItem>
                  <SelectItem value="WAITING_PARTS">Aguardando Peças</SelectItem>
                  <SelectItem value="TESTING">Em Testes</SelectItem>
                  <SelectItem value="COMPLETED">Concluída</SelectItem>
                  <SelectItem value="DELIVERED">Entregue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="technician">Técnico</Label>
              <Select value={filters.technicianId} onValueChange={(value) => setFilters(prev => ({ ...prev, technicianId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os técnicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os técnicos</SelectItem>
                  {technicians.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select value={filters.clientId} onValueChange={(value) => setFilters(prev => ({ ...prev, clientId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipmentType">Tipo de Equipamento</Label>
              <Input
                id="equipmentType"
                placeholder="Ex: Smartphone, Notebook..."
                value={filters.equipmentType}
                onChange={(e) => setFilters(prev => ({ ...prev, equipmentType: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={generateReport} disabled={loading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
          
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
                <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {reportData.stats.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.stats.averageCompletionTime ? `${reportData.stats.averageCompletionTime} dias` : 'N/A'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.stats.byStatus.COMPLETED || 0}</div>
              </CardContent>
            </Card>
          </div>

          

          {/* Ações de Download */}
          <Card>
            <CardHeader>
              <CardTitle>Exportar Relatório</CardTitle>
              <CardDescription>
                Baixe o relatório nos formatos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Button onClick={downloadPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                  Baixar PDF
                </Button>
                <Button onClick={downloadExcel} variant="outline">
                  <Download className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                  Baixar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Ordens de Serviço */}
          <Card>
            <CardHeader>
              <CardTitle>Ordens de Serviço ({reportData.serviceOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-soft">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nº Ordem</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Equipamento</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Técnico</th>
                      <th className="text-left p-2">Data Criação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.serviceOrders.map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-2 font-medium">{order.orderNumber}</td>
                        <td className="p-2">{order.client?.name || 'N/A'}</td>
                        <td className="p-2">{order.equipmentType}</td>
                        <td className="p-2">
                          <Badge variant={getStatusVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="p-2">{order.technician?.name || 'Não atribuído'}</td>
                        <td className="p-2">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
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

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'PENDING': 'outline',
    'IN_ANALYSIS': 'secondary',
    'APPROVED': 'secondary',
    'IN_PROGRESS': 'default',
    'WAITING_PARTS': 'secondary',
    'TESTING': 'secondary',
    'COMPLETED': 'secondary',
    'DELIVERED': 'secondary',
    'CANCELLED': 'destructive'
  }
  return variants[status] || 'default'
}
