'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { Toast } from '@/lib/toast'
import { Separator } from '@/components/ui/separator'
import type { ServiceOrderStatus } from '@/lib/types'

interface BudgetItem {
  type: 'PECA' | 'SERVICO'
  title: string
  quantity: number
  unitCost: number
  unitPrice: number
  estimatedHours: number
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
  status: ServiceOrderStatus
  reportedDefect: string
  receivedAccessories: string | null
  budgetNote: string | null
  technicalExplanation?: string | null
  openingDate: string
  arrivalDate?: string | null
  completionDate?: string | null
  deliveryDate?: string | null
  paymentDate?: string | null
  price?: number | null
  cost?: number | null
  budgetItems?: BudgetItem[] | null
}

interface Client {
  id: string
  name: string
  email: string
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
  technicalExplanation: string
  arrivalDate: string
  completionDate: string
  deliveryDate: string

}

export default function EditServiceOrderPage() {
  const router = useRouter()
  const params = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])

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
    budgetNote: '',
    technicalExplanation: '',
    arrivalDate: '',
    completionDate: '',
    deliveryDate: '',

  })

  useEffect(() => {
    const id = params?.id as string | undefined
    if (!id) return

    const loadAll = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchServiceOrder(id), fetchClients(), fetchTechnicians()])
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [params?.id])

  const fetchServiceOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/service-orders/${id}`, { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          router.push('/login')
          return
        }
        throw new Error('Erro ao carregar ordem de serviço')
      }
      const data = await res.json()
      setServiceOrder(data)
      setFormData({
        clientId: data.clientId,
        technicianId: data.technicianId || '',
        equipmentType: data.equipmentType,
        brand: data.brand,
        model: data.model,
        reportedDefect: data.reportedDefect,
        status: data.status,
        serialNumber: data.serialNumber || '',
        receivedAccessories: data.receivedAccessories || '',
        budgetNote: data.budgetNote || '',
        technicalExplanation: data.technicalExplanation || '',
        arrivalDate: data.arrivalDate ? String(data.arrivalDate).slice(0,10) : '',
        completionDate: data.completionDate ? String(data.completionDate).slice(0,10) : '',
        deliveryDate: data.deliveryDate ? String(data.deliveryDate).slice(0,10) : '',

      })
      setBudgetItems(Array.isArray(data.budgetItems) ? data.budgetItems.map((i: any) => ({
        type: i.type,
        title: i.title,
        quantity: Number(i.quantity) || 1,
        unitCost: Number(i.unitCost) || 0,
        unitPrice: Number(i.unitPrice ?? i.unitCost ?? 0),
        estimatedHours: Number(i.estimatedHours) || 0,
      })) : [])
    } catch (err) {
      console.error(err)
      Toast.apiError(err)
      setError('Erro ao carregar ordem de serviço')
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Não autorizado ao carregar clientes (401)')
          return
        }
        throw new Error('Erro ao carregar clientes')
      }
      const data = await res.json()
      setClients(data.clients || data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/technicians', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Não autorizado ao carregar técnicos (401)')
          return
        }
        throw new Error('Erro ao carregar técnicos')
      }
      const data = await res.json()
      setTechnicians(data.technicians || data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const id = params?.id as string | undefined
    if (!id) return

    // Validações condicionais por status
    if (formData.status === 'MELHORAR' && !formData.technicianId) {
      setError('Para mover para "Melhorar" é necessário atribuir um técnico.')
      return
    }

    // Montar payload sem campos vazios opcionais
    const payload: any = { ...formData }
    ;['arrivalDate','completionDate','deliveryDate','openingDate','paymentDate'].forEach((k) => {
      if (!payload[k]) delete payload[k]
    })

    // Remover SEMPRE campos não editáveis: cliente, equipamento, observações e chegada
    ;['clientId','equipmentType','brand','model','serialNumber','reportedDefect','receivedAccessories','budgetNote','arrivalDate'].forEach((k) => {
      if (k in payload) delete payload[k]
    })

    // Remover campos string vazios opcionais
    ;['technicianId','budgetNote','technicalExplanation'].forEach((k) => {
      if (typeof payload[k] === 'string' && payload[k].trim() === '') delete payload[k]
    })

    // Não permitir alteração de explicação técnica quando aprovado
    const isApprovedForm = formData.status === 'APROVADO'
    if (isApprovedForm && 'technicalExplanation' in payload) {
      delete payload.technicalExplanation
    }

    // Enviar itens de orçamento apenas quando aplicável
    if (formData.status === 'ORCAMENTAR') {
      payload.budgetItems = budgetItems
    } else {
      if ('budgetItems' in payload) delete payload.budgetItems
    }

    try {
      const response = await fetch(`/api/service-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          router.push('/login')
          return
        }
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Erro ao atualizar ordem de serviço')
      }

      Toast.success('Ordem de serviço atualizada com sucesso!')
      router.push(`/dashboard/service-orders/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar ordem de serviço')
      Toast.apiError(err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Totais e lucro (preço vs custo)
  const totalPrice = budgetItems.reduce((sum, i) => sum + (i.quantity * ((i.unitPrice ?? i.unitCost) ?? 0)), 0)
  const totalCost = budgetItems.reduce((sum, i) => sum + (i.quantity * (i.unitCost ?? 0)), 0)
  const totalDays = budgetItems.reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0)
  const profit = totalPrice - totalCost
  const profitPerDay = totalDays > 0 ? profit / totalDays : 0

  // Opções de status conforme estado atual
  const allStatuses: ServiceOrderStatus[] = [
    'SEM_VER',
    'ORCAMENTAR',
    'APROVADO',
    'ESPERANDO_PECAS',
    'COMPRADO',
    'MELHORAR',
    'TERMINADO',
    'SEM_PROBLEMA',
    'SEM_CONSERTO',
    'DEVOLVER',
    'DEVOLVIDO',
    'DESCARTE',
    'VENDIDO',
    'ESPERANDO_CLIENTE',
  ]

  const statusLabels: Record<ServiceOrderStatus, string> = {
    SEM_VER: 'Sem Ver',
    ORCAMENTAR: 'Orçamentar',
    APROVADO: 'Aprovado',
    ESPERANDO_PECAS: 'Esperando Peças',
    COMPRADO: 'Comprado',
    MELHORAR: 'Melhorar',
    TERMINADO: 'Terminado',
    SEM_PROBLEMA: 'Sem Problema',
    SEM_CONSERTO: 'Reprovado', // etiqueta amigável
    DEVOLVER: 'Devolver',
    DEVOLVIDO: 'Cancelado', // etiqueta amigável
    DESCARTE: 'Descarte',
    VENDIDO: 'Vendido',
    ESPERANDO_CLIENTE: 'Esperando Cliente',
  }

  const nextStatuses: ServiceOrderStatus[] =
    formData.status === 'SEM_VER'
      ? ['ORCAMENTAR', 'DEVOLVIDO', 'DESCARTE']
      : formData.status === 'ORCAMENTAR'
      ? ['APROVADO', 'SEM_CONSERTO', 'DEVOLVIDO', 'DESCARTE']
      : formData.status === 'APROVADO'
      ? ['ESPERANDO_PECAS', 'SEM_CONSERTO', 'DEVOLVIDO', 'DESCARTE']
      : allStatuses
  const statusOptions: ServiceOrderStatus[] = Array.from(new Set([formData.status, ...nextStatuses]))

  const isApproved = formData.status === 'APROVADO'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" hoverable={false} onClick={() => router.push('/dashboard/service-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Editar Ordem de Serviço</h1>
        </div>
        {serviceOrder && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">OS:</span> {serviceOrder.orderNumber}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card hoverable={false} className="shadow-sm">
          <CardHeader>
            <CardTitle>Ordem de Serviço</CardTitle>
            <CardDescription>Atualize status, dados e observações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Dados não editáveis: Cliente e Equipamento */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium">Cliente</Label>
                    <p className="text-sm text-muted-foreground">
                      {clients.find(c => c.id === formData.clientId)?.name || 'N/A'} — {clients.find(c => c.id === formData.clientId)?.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Número da OS</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder?.orderNumber || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Data de Chegada</Label>
                  <p className="text-sm text-muted-foreground">
                    {serviceOrder?.arrivalDate ? String(serviceOrder.arrivalDate).slice(0,10) : 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm font-medium">Tipo de Equipamento</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder?.equipmentType || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Marca</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder?.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Modelo</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder?.model || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Número de Série</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder?.serialNumber || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Defeito Relatado</Label>
                  <p className="text-sm text-muted-foreground">{serviceOrder?.reportedDefect || 'N/A'}</p>
                </div>

                {serviceOrder?.receivedAccessories && (
                  <div>
                    <Label className="text-sm font-medium">Acessórios Recebidos</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder?.receivedAccessories}</p>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Select
                      value={formData.status}
                      onValueChange={(value: ServiceOrderStatus) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger focusable={false}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-4">


                  {formData.status === 'TERMINADO' && (
                    <div className="space-y-2">
                      <Label htmlFor="completionDate">Data de Conclusão</Label>
                      <Input
                        id="completionDate"
                        type="date"
                        value={formData.completionDate}
                        onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                        focusable={false}
                      />
                    </div>
                  )}

                  {formData.status === 'DEVOLVIDO' && (
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">Data de Entrega</Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                        focusable={false}
                      />
                    </div>
                  )}

                  {formData.status === 'MELHORAR' && (
                    <Alert>
                      <AlertDescription>Selecione um técnico responsável — obrigatório para "Melhorar".</AlertDescription>
                    </Alert>
                  )}

                 {/* Removido alerta informativo para status APROVADO */}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Cliente e Técnico */}
               {/* Técnico (oculto quando status é SEM_VER) */}
               {formData.status !== 'SEM_VER' && (
                 <div className="space-y-2">
                   <div className="grid grid-cols-1 gap-6">
                     <div className="space-y-2">
                       <Label htmlFor="technicianId">Técnico</Label>
                       {isApproved ? (
                         <p className="text-sm text-muted-foreground">
                           {technicians.find(t => t.id === formData.technicianId)?.name || 'N/A'} - {technicians.find(t => t.id === formData.technicianId)?.email || 'N/A'}
                         </p>
                       ) : (
                         <>
                           <Select value={formData.technicianId} onValueChange={(value) => setFormData({ ...formData, technicianId: value })}>
                             <SelectTrigger>
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {technicians.filter(t => t.isAvailable).map((technician) => (
                                 <SelectItem key={technician.id} value={technician.id}>
                                   {technician.name} - {technician.email}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           {formData.status === 'MELHORAR' && (
                             <p className="text-xs text-muted-foreground">Obrigatório para "Melhorar"</p>
                           )}
                         </>
                       )}
                     </div>
                   </div>

                   {(formData.status === 'ORCAMENTAR' || formData.status === 'APROVADO') && (
                     <div className="space-y-4 mt-6">
                       <Separator className="my-4" />
                       <Label className="text-sm font-medium">Itens do Orçamento</Label>
                       <p className="text-xs text-muted-foreground">Liste peças e serviços com custos e tempo estimado.</p>
                       <div className="rounded-md border bg-card/50 shadow-sm overflow-x-auto">

                         <div className="p-2 space-y-2 md:space-y-0 md:divide-y md:divide-border/20">
                           {/* Cabeçalhos da grade (desktop) */}
                           <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-semibold text-foreground/70 pb-2">
                             <div className="md:col-span-1">Tipo</div>
                             <div className="md:col-span-5">Descrição</div>
                             <div className="md:col-span-1">Qtd</div>
                             <div className="md:col-span-1">Custo Unitário</div>
                             <div className="md:col-span-1">Preço Unitário</div>
                             <div className="md:col-span-2 text-right">Valor</div>
                             <div className="md:col-span-1 text-right">Dias</div>
                           </div>
                           {budgetItems.map((item, idx) => (
                             <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center md:py-1">
                                <div className="md:col-span-1 min-w-0">
                                  <Label className="block md:hidden">Tipo</Label>
                                  {isApproved ? (
                                    <p className="text-sm text-muted-foreground">{item.type === 'PECA' ? 'Peça' : 'Serviço'}</p>
                                  ) : (
                                    <Select value={item.type} onValueChange={(value: 'PECA' | 'SERVICO') => {
                                      const next = [...budgetItems]
                                      next[idx] = { ...next[idx], type: value }
                                      setBudgetItems(next)
                                    }}>
                                     <SelectTrigger className="h-9 rounded-lg px-2">
                                       <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="PECA">Peça</SelectItem>
                                       <SelectItem value="SERVICO">Serviço</SelectItem>
                                     </SelectContent>
                                   </Select>
                                  )}
                               </div>
                                <div className="md:col-span-5 min-w-0">
                                  <Label className="block md:hidden">Descrição</Label>
                                  {isApproved ? (
                                    <p className="text-sm text-muted-foreground">{item.title || '—'}</p>
                                  ) : (
                                    <Input className="w-full h-9 rounded-lg px-2" value={item.title} onChange={(e) => {
                                      const next = [...budgetItems]
                                      next[idx] = { ...next[idx], title: e.target.value }
                                      setBudgetItems(next)
                                    }} placeholder="Ex: Placa mãe, Solda em conector, etc." />
                                  )}
                               </div>
                              <div className="md:col-span-1">
                               <Label className="block md:hidden">Quantidade</Label>
                               {isApproved ? (
                                 <p className="text-sm text-right tabular-nums min-w-[120px]">{item.quantity}</p>
                               ) : (
                                 <Input className="text-right w-24 h-9 rounded-lg px-2 tabular-nums" type="number" min={1} value={item.quantity} onChange={(e) => {
                                    const next = [...budgetItems]
                                    next[idx] = { ...next[idx], quantity: Number(e.target.value) || 1 }
                                    setBudgetItems(next)
                                  }} />
                               )}
                              </div>
                              <div className="md:col-span-1">
                                <Label className="block md:hidden">Custo Unitário (R$)</Label>
                                {isApproved ? (
                                  <p className="text-sm text-right tabular-nums min-w-[120px]">{item.unitCost.toFixed(2)}</p>
                                ) : (
                                  <Input className="text-right w-24 h-9 rounded-lg px-2 tabular-nums" type="number" step="0.01" value={item.unitCost} onChange={(e) => {
                                    const next = [...budgetItems]
                                    next[idx] = { ...next[idx], unitCost: Number(e.target.value) || 0 }
                                    setBudgetItems(next)
                                  }} />
                                )}
                              </div>
                              <div className="md:col-span-1">
                                <Label className="block md:hidden">Preço Unitário (R$)</Label>
                                {isApproved ? (
                                  <p className="text-sm text-right tabular-nums min-w-[120px]">{(item.unitPrice ?? 0).toFixed(2)}</p>
                                ) : (
                                  <Input className="text-right w-24 h-9 rounded-lg px-2 tabular-nums" type="number" step="0.01" value={item.unitPrice ?? 0} onChange={(e) => {
                                    const next = [...budgetItems]
                                    next[idx] = { ...next[idx], unitPrice: Number(e.target.value) || 0 }
                                    setBudgetItems(next)
                                  }} />
                                )}
                              </div>
                              <div className="md:col-span-2">
                                <Label className="block md:hidden">Valor (R$)</Label>
                                <p className="text-sm text-right font-medium tabular-nums min-w-[120px]">R$ {(((item.quantity ?? 1) * ((item.unitPrice ?? item.unitCost) ?? 0))).toFixed(2)}</p>
                              </div>
                              <div className="md:col-span-1">
                                <Label className="block md:hidden">Dias Estimados</Label>
                                {isApproved ? (
                                  <p className="text-sm text-right tabular-nums min-w-[120px]">{item.estimatedHours}</p>
                                ) : (
                                  <Input className="text-right w-24 h-9 rounded-lg px-2 tabular-nums" type="number" step="1" value={item.estimatedHours} onChange={(e) => {
                                     const next = [...budgetItems]
                                     next[idx] = { ...next[idx], estimatedHours: Number(e.target.value) || 0 }
                                     setBudgetItems(next)
                                   }} />
                                )}
                              </div>
                              {!isApproved && (
                                <div className="md:col-span-12 flex justify-end md:pt-1">
                                   <Button type="button" variant="outline" onClick={() => {
                                     const next = budgetItems.filter((_, i) => i !== idx)
                                     setBudgetItems(next)
                                   }}>Remover</Button>
                                 </div>
                              )}
                             </div>
                           ))}
                         </div>
                       </div>

                       <div className="flex justify-between items-center mt-4">
                         {!isApproved && (
                           <Button type="button" variant="outline" onClick={() => {
                             setBudgetItems([...budgetItems, { type: 'PECA', title: '', quantity: 1, unitCost: 0, unitPrice: 0, estimatedHours: 0 }])
                           }}>Adicionar Item</Button>
                         )}
                         <div className="text-sm bg-muted/30 rounded-md px-2 py-1">
                           <div className="font-medium">
                             Total: R$ {totalPrice.toFixed(2)} — Dias: {totalDays.toFixed(0)}
                           </div>
                           <div className="text-muted-foreground">
                             Lucro: R$ {profit.toFixed(2)} — Lucro/Dia: R$ {profitPerDay.toFixed(2)}
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               )}

              <Separator className="my-6" />



              <Separator className="my-6" />



              {/* Explicação Técnica */}
              {formData.status !== 'SEM_VER' && (
                <div className="space-y-2">
                  <Label htmlFor="technicalExplanation">Explicação Técnica</Label>
                  {isApproved ? (
                    <div className="rounded-md border bg-card/50 p-3">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.technicalExplanation || '—'}</p>
                    </div>
                  ) : (
                    <Textarea
                      id="technicalExplanation"
                      value={formData.technicalExplanation}
                      onChange={(e) => setFormData({ ...formData, technicalExplanation: e.target.value })}
                      rows={5}
                      placeholder="Descreva a análise técnica do defeito"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">{isApproved ? 'Bloqueado após aprovação.' : 'Campo opcional para diagnóstico técnico.'}</p>
                </div>
              )}



              <Separator className="my-6" />



              {/* Erros */}
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Separator className="my-6" />

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" hoverable={false} onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" hoverable={false}>Salvar Alterações</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
