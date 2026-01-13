'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ServiceOrdersTable } from '@/components/ui/service-orders-table'
import { Plus, Edit, Trash2, Eye, Calendar, User, Wrench, FileText } from 'lucide-react'
import { Toast } from '@/lib/toast'
import type { ServiceOrderStatus } from '@/lib/types'

interface ServiceOrder {
  id: string;
  orderNumber: string;
  clientId: string;
  technicianId: string | null;
  equipmentType: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  status: ServiceOrderStatus;
  reportedDefect: string;
  receivedAccessories: string | null;
  budgetNote: string | null;
  arrivalDate: string | null;
  openingDate: string;
  completionDate: string | null;
  deliveryDate: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  technician: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
}

interface Technician {
  id: string
  name: string
  email: string
  isAvailable: boolean
}

interface FormData {
  clientId: string
  technicianId: string
  equipmentType: string
  brand: string
  model: string
  reportedDefect: string
  status: ServiceOrderStatus
  serialNumber: string
  receivedAccessories: string
  budgetNote: string
}



const getStatusLabel = (status: ServiceOrderStatus) => {
  const labels: Record<ServiceOrderStatus, string> = {
    SEM_VER: 'Sem Ver',
    ORCAMENTAR: 'Orçamentar',
    APROVADO: 'Aprovado',
    ESPERANDO_PECAS: 'Esperando Peças',
    COMPRADO: 'Comprado',
    MELHORAR: 'Melhorar',
    TERMINADO: 'Terminado',
    SEM_PROBLEMA: 'Sem Problema',
    SEM_CONSERTO: 'Sem Conserto',
    DEVOLVER: 'Devolver',
    DEVOLVIDO: 'Devolvido',
    DESCARTE: 'Descarte',
    VENDIDO: 'Vendido',
    ESPERANDO_CLIENTE: 'Esperando Cliente'
  }
  return labels[status]
}

const getStatusColor = (status: ServiceOrderStatus) => {
  const colors: Record<ServiceOrderStatus, string> = {
    SEM_VER: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
    ORCAMENTAR: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
    APROVADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    ESPERANDO_PECAS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    COMPRADO: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
    MELHORAR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
    TERMINADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    SEM_PROBLEMA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    SEM_CONSERTO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    DEVOLVER: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    DEVOLVIDO: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
    DESCARTE: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100',
    VENDIDO: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
    ESPERANDO_CLIENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
  }
  return colors[status]
}


export default function ServiceOrdersPage() {
  const router = useRouter()
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<'orderNumber' | 'clientName' | 'equipmentType' | 'brand' | 'status' | 'openingDate'>('orderNumber')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [clients, setClients] = useState<Client[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)

  const [formData, setFormData] = useState<FormData>({
    clientId: '',
    technicianId: '',
    equipmentType: '',
    brand: '',
    model: '',
    reportedDefect: '',
    status: 'SEM_VER',
    serialNumber: '',
    receivedAccessories: '',
    budgetNote: ''
  })

  useEffect(() => {
    fetchServiceOrders(currentPage, itemsPerPage, searchTerm, sortField, sortDirection)
    fetchClients()
    fetchTechnicians()
  }, [currentPage, itemsPerPage, searchTerm, sortField, sortDirection])

  const fetchServiceOrders = async (
    page = 1,
    limit = 10,
    search = '',
    sortFieldParam: 'orderNumber' | 'clientName' | 'equipmentType' | 'brand' | 'status' | 'openingDate' = sortField,
    sortDirectionParam: 'asc' | 'desc' = sortDirection
  ) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) })
      params.set('sortField', sortFieldParam)
      params.set('sortDirection', sortDirectionParam)
      const response = await fetch(`/api/service-orders?${params.toString()}`, { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          console.error('Não autorizado ao carregar ordens de serviço (401)')
          router.push('/login')
          return
        }
        let message = 'Erro ao carregar ordens de serviço'
        try {
          const errJson = await response.json()
          message = errJson?.error || message
        } catch (_) {}
        throw new Error(message)
      }
      
      const data = await response.json()
      const list = data.serviceOrders || data
      setServiceOrders(list)
      if (data.pagination) {
        setTotalRecords(data.pagination.total)
        setTotalPages(data.pagination.pages)
      } else {
        setTotalRecords(Array.isArray(list) ? list.length : 0)
        setTotalPages(1)
      }
    } catch (err) {
      setError('Erro ao carregar ordens de serviço')
      console.error(err)
      Toast.apiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSortChange = (
    field: 'orderNumber' | 'clientName' | 'equipmentType' | 'brand' | 'status' | 'openingDate',
    direction: 'asc' | 'desc'
  ) => {
    setSortField(field)
    setSortDirection(direction)
    setCurrentPage(1)
  }

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Não autorizado ao carregar clientes (401)')
          return
        }
        throw new Error('Erro ao carregar clientes')
      }
      const data = await response.json()
      setClients(data.clients || data)
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Não autorizado ao carregar técnicos (401)')
          return
        }
        throw new Error('Erro ao carregar técnicos')
      }
      const data = await response.json()
      setTechnicians(data.technicians || data)
    } catch (err) {
      console.error('Erro ao carregar técnicos:', err)
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (!selectedOrder?.id) {
        throw new Error('Ordem de serviço não selecionada');
      }
      
      const response = await fetch(`/api/service-orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          router.push('/login')
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar ordem de serviço')
      }

      await fetchServiceOrders()
      setIsEditDialogOpen(false)
      Toast.success('Ordem de serviço atualizada com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar ordem de serviço')
      Toast.apiError(err)
    }
  }

  const handleEdit = (order: ServiceOrder) => {
    router.push(`/dashboard/service-orders/${order.id}/edit`)
  }

  const handleView = (order: ServiceOrder) => {
    router.push(`/dashboard/service-orders/${order.id}`)
  }


  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ordem de serviço?')) return

    try {
      const response = await fetch(`/api/service-orders/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          router.push('/login')
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir ordem de serviço')
      }

      await fetchServiceOrders(currentPage, itemsPerPage, searchTerm, sortField, sortDirection)
      Toast.success('Ordem de serviço excluída com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir ordem de serviço')
      Toast.apiError(err)
    }
  }



  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-muted-foreground">
            Gerencie todas as ordens de serviço da empresa
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/service-orders/nova')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      {/* Tabela de Ordens */}
      <ServiceOrdersTable
        serviceOrders={serviceOrders}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchTerm={searchTerm}
        onSearchChange={(term) => { setSearchTerm(term); setCurrentPage(1); }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalRecords={totalRecords}
        totalPages={totalPages}
        onItemsPerPageChange={(limit) => setItemsPerPage(limit)}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Edite as informações da ordem de serviço
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mesmo formulário da criação */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({...formData, clientId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="technicianId">Técnico</Label>
                <Select value={formData.technicianId} onValueChange={(value) => setFormData({...formData, technicianId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.filter(tech => tech.isAvailable).map((technician) => (
                      <SelectItem key={technician.id} value={technician.id}>
                        {technician.name} - {technician.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipmentType">Tipo do Equipamento *</Label>
                <Input
                  id="equipmentType"
                  value={formData.equipmentType}
                  onChange={(e) => setFormData({...formData, equipmentType: e.target.value})}
                  placeholder="Ex: Smartphone, Notebook, TV"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="Ex: Apple, Dell, Samsung"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="Ex: iPhone 12, Inspiron 15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportedDefect">Defeito Relatado *</Label>
              <Textarea
                id="reportedDefect"
                value={formData.reportedDefect}
                onChange={(e) => setFormData({...formData, reportedDefect: e.target.value})}
                placeholder="Descreva detalhadamente o problema relatado pelo cliente"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Número de Série</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  placeholder="Número de série do equipamento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedAccessories">Acessórios Recebidos</Label>
                <Input
                  id="receivedAccessories"
                  value={formData.receivedAccessories}
                  onChange={(e) => setFormData({...formData, receivedAccessories: e.target.value})}
                  placeholder="Ex: Carregador, cabo, capa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetNote">Observações do Orçamento</Label>
              <Textarea
                id="budgetNote"
                value={formData.budgetNote}
                onChange={(e) => setFormData({...formData, budgetNote: e.target.value})}
                placeholder="Observações sobre o orçamento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: ServiceOrder['status']) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOrder?.status === 'SEM_VER' ? (
                      <>
                        <SelectItem value="SEM_VER">Sem Ver</SelectItem>
                        <SelectItem value="ORCAMENTAR">Orçamentar</SelectItem>
                        <SelectItem value="DEVOLVIDO">Devolvido</SelectItem>
                        <SelectItem value="DESCARTE">Descarte</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="SEM_VER">Sem Ver</SelectItem>
                        <SelectItem value="ORCAMENTAR">Orçamentar</SelectItem>
                        <SelectItem value="APROVADO">Aprovado</SelectItem>
                        <SelectItem value="ESPERANDO_PECAS">Esperando Peças</SelectItem>
                        <SelectItem value="COMPRADO">Comprado</SelectItem>
                        <SelectItem value="MELHORAR">Melhorar</SelectItem>
                        <SelectItem value="TERMINADO">Terminado</SelectItem>
                        <SelectItem value="SEM_PROBLEMA">Sem Problema</SelectItem>
                        <SelectItem value="SEM_CONSERTO">Sem Conserto</SelectItem>
                        <SelectItem value="DEVOLVER">Devolver</SelectItem>
                        <SelectItem value="DEVOLVIDO">Devolvido</SelectItem>
                        <SelectItem value="DESCARTE">Descarte</SelectItem>
                        <SelectItem value="VENDIDO">Vendido</SelectItem>
                        <SelectItem value="ESPERANDO_CLIENTE">Esperando Cliente</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Visualize todas as informações da ordem de serviço
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Número da Ordem</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {getStatusLabel(selectedOrder.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.client.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.client.email}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.client.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Técnico</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.technician ? selectedOrder.technician.name : 'Não atribuído'}
                  </p>
                  {selectedOrder.technician && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.technician.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.equipmentType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Marca</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.brand}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Modelo</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.model}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Defeito Relatado</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedOrder.reportedDefect}</p>
              </div>

              {selectedOrder.serialNumber && (
                <div>
                  <Label className="text-sm font-medium">Número de Série</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedOrder.serialNumber}</p>
                </div>
              )}

              {selectedOrder.receivedAccessories && (
                <div>
                  <Label className="text-sm font-medium">Acessórios Recebidos</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedOrder.receivedAccessories}</p>
                </div>
              )}

              {selectedOrder.budgetNote && (
                <div>
                  <Label className="text-sm font-medium">Observações do Orçamento</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedOrder.budgetNote}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data de Abertura</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.openingDate)}</p>
                </div>
                {selectedOrder.arrivalDate && (
                  <div>
                    <Label className="text-sm font-medium">Data de Chegada</Label>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.arrivalDate)}</p>
                  </div>
                )}
              </div>

              {selectedOrder.completionDate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Data de Conclusão</Label>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.completionDate)}</p>
                  </div>
                  {selectedOrder.deliveryDate && (
                    <div>
                      <Label className="text-sm font-medium">Data de Entrega</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.deliveryDate)}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.paymentDate && (
                <div>
                  <Label className="text-sm font-medium">Data de Pagamento</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.paymentDate)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}