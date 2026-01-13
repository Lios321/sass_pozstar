'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
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
  price?: number | null;
  cost?: number | null;
  budgetItems?: BudgetItem[] | null;
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



export default function ServiceOrderDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchServiceOrder()
    }
  }, [params.id])

  const fetchServiceOrder = async () => {
    try {
      const response = await fetch(`/api/service-orders/${params.id}`, { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Sessão expirada ou não autorizada. Faça login novamente.')
          router.push('/login')
          return
        }
        throw new Error('Erro ao carregar ordem de serviço')
      }
      
      const data = await response.json()
      setServiceOrder(data)
    } catch (error) {
      console.error('Erro ao carregar ordem de serviço:', error)
      toast.error('Erro ao carregar ordem de serviço')
    } finally {
      setLoading(false)
    }
  }



  const handleDownloadReceipt = async () => {
    try {
      const response = await fetch(`/api/service-orders/${params.id}/receipt`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let errorMessage = 'Erro ao baixar comprovante'
        if (response.status === 401) {
          errorMessage = 'Sessão expirada ou não autorizada. Faça login novamente.'
        } else {
          try {
            if (contentType.includes('application/json')) {
              const data = await response.json()
              errorMessage = data?.error || errorMessage
            } else {
              const text = await response.text()
              errorMessage = text || errorMessage
            }
          } catch (_) {
            // ignore parse errors and use default message
          }
        }
        console.error('Download de comprovante falhou:', response.status, errorMessage)
        toast.error(errorMessage)
        return
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `comprovante-os-${serviceOrder?.orderNumber || 'unknown'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Comprovante baixado com sucesso!')
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error)
      toast.error('Erro ao baixar comprovante')
    }
  }

  // Novo: download do comprovante de orçamento
  const handleDownloadBudget = async () => {
    try {
      const response = await fetch(`/api/service-orders/${params.id}/budget`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let errorMessage = 'Erro ao baixar comprovante de orçamento'
        if (response.status === 401) {
          errorMessage = 'Sessão expirada ou não autorizada. Faça login novamente.'
        } else if (response.status === 400) {
          errorMessage = 'Itens de orçamento ausentes para esta OS.'
        } else {
          try {
            if (contentType.includes('application/json')) {
              const data = await response.json()
              errorMessage = data?.error || data?.reason || errorMessage
            } else {
              const text = await response.text()
              errorMessage = text || errorMessage
            }
          } catch (_) {}
        }
        console.error('Download de orçamento falhou:', response.status, errorMessage)
        toast.error(errorMessage)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `orcamento-os-${serviceOrder?.orderNumber || 'unknown'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Orçamento baixado com sucesso!')
    } catch (error) {
      console.error('Erro ao baixar orçamento:', error)
      toast.error('Erro ao baixar orçamento')
    }
  }
  const handleResendReceipt = async (method: 'EMAIL' | 'WHATSAPP' | 'BOTH') => {
    setIsResending(true)
    try {
      const response = await fetch(`/api/service-orders/${params.id}/receipt/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ method }),
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Sessão expirada ou não autorizada. Faça login novamente.')
        }
        throw new Error('Erro ao reenviar comprovante')
      }
      
      const data = await response.json()
      toast.success(data.message)
      

    } catch (error) {
      console.error('Erro ao reenviar comprovante:', error)
      toast.error('Erro ao reenviar comprovante')
    } finally {
      setIsResending(false)
    }
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



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!serviceOrder) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ordem de serviço não encontrada</p>
        <Button onClick={() => router.push('/dashboard/service-orders')} className="mt-4">
          Voltar para Lista
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/service-orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              OS #{serviceOrder.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              Detalhes da ordem de serviço
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(serviceOrder.status)}>
          {getStatusLabel(serviceOrder.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Equipamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tipo de Equipamento</Label>
                  <p className="text-sm text-muted-foreground">{serviceOrder.equipmentType || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Marca</Label>
                  <p className="text-sm text-muted-foreground">{serviceOrder.brand || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Modelo</Label>
                  <p className="text-sm text-muted-foreground">{serviceOrder.model || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Número de Série</Label>
                  <p className="text-sm text-muted-foreground">{serviceOrder.serialNumber || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Defeito Relatado</Label>
                <p className="text-sm text-muted-foreground">{serviceOrder.reportedDefect}</p>
              </div>
              {serviceOrder.receivedAccessories && (
                <div>
                  <Label className="text-sm font-medium">Acessórios Recebidos</Label>
                  <p className="text-sm text-muted-foreground">{serviceOrder.receivedAccessories}</p>
                </div>
              )}
            </CardContent>
          </Card>



          {(serviceOrder.status === 'ORCAMENTAR' || serviceOrder.status === 'APROVADO') && Array.isArray(serviceOrder.budgetItems) && serviceOrder.budgetItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itens do Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Peças e serviços previstos, com custos e tempo.</p>
                <div className="rounded-md border bg-card/50 shadow-sm overflow-x-auto">

                  <div className="p-3 space-y-3 md:space-y-0 md:divide-y md:divide-border/20">
                    {serviceOrder.budgetItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Tipo</Label>
                          <p className="text-sm text-muted-foreground">{item.type === 'PECA' ? 'Peça' : 'Serviço'}</p>
                        </div>
                        <div className="md:col-span-4">
                          <Label className="text-sm font-medium">Descrição</Label>
                          <p className="text-sm text-muted-foreground">{item.title}</p>
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-sm font-medium">Quantidade</Label>
                          <p className="text-sm text-muted-foreground text-right">{item.quantity}</p>
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-sm font-medium">Custo Unitário</Label>
                          <p className="text-sm text-muted-foreground text-right">R$ {Number(item.unitCost).toFixed(2)}</p>
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-sm font-medium">Preço (R$)</Label>
                          <p className="text-sm text-muted-foreground text-right">R$ {Number((item.unitPrice ?? item.unitCost) ?? 0).toFixed(2)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Valor (R$)</Label>
                          <p className="text-sm text-muted-foreground text-right">R$ {Number(item.quantity * ((item.unitPrice ?? item.unitCost) ?? 0)).toFixed(2)}</p>
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-sm font-medium">Dias Estimados</Label>
                          <p className="text-sm text-muted-foreground text-right">{Number(item.estimatedHours).toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="text-sm bg-muted/30 rounded-md px-3 py-2">
                    <div className="font-medium">
                      Total: R$ {serviceOrder.budgetItems.reduce((sum, i) => sum + (i.quantity * ((i.unitPrice ?? i.unitCost) ?? 0)), 0).toFixed(2)} — Dias: {serviceOrder.budgetItems.reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0).toFixed(1)}
                    </div>
                    <div className="text-muted-foreground">
                      {(() => {
                        const totalPrice = serviceOrder.budgetItems!.reduce((sum, i) => sum + (i.quantity * ((i.unitPrice ?? i.unitCost) ?? 0)), 0)
                        const totalCost = serviceOrder.budgetItems!.reduce((sum, i) => sum + (i.quantity * (i.unitCost ?? 0)), 0)
                        const totalDays = serviceOrder.budgetItems!.reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0)
                        const profit = totalPrice - totalCost
                        const profitPerDay = totalDays > 0 ? profit / totalDays : 0
                        return `Lucro: R$ ${profit.toFixed(2)} — Lucro/Dia: R$ ${profitPerDay.toFixed(2)}`
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Técnico Responsável */}
          {serviceOrder.technician && (
            <Card>
              <CardHeader>
                <CardTitle>Técnico Responsável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Nome</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder.technician.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder.technician.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Telefone</Label>
                    <p className="text-sm text-muted-foreground">{serviceOrder.technician.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Ações e Comprovantes */}
        <div className="space-y-6">
          {/* Comprovante de Recebimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comprovante de Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleDownloadReceipt}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar comprovante de recebimento
              </Button>

              {/* Removido bloco de "Reenviar por" conforme solicitado */}
              

            </CardContent>
          </Card>

          {/* Comprovante de Orçamento (visível em ORCAMENTAR e APROVADO) */}
          {(serviceOrder.status === 'ORCAMENTAR' || serviceOrder.status === 'APROVADO') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Comprovante de Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleDownloadBudget}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar comprovante de orçamento
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle>Datas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Data de Chegada</Label>
                <p className="text-sm text-muted-foreground">
                  {serviceOrder.arrivalDate ? formatDate(serviceOrder.arrivalDate) : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Data de Abertura</Label>
                <p className="text-sm text-muted-foreground">{formatDate(serviceOrder.openingDate)}</p>
              </div>
              {serviceOrder.status === 'APROVADO' && (
                <div>
                  <Label className="text-sm font-medium">Data de Aprovação</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(serviceOrder.updatedAt)}</p>
                </div>
              )}
              {serviceOrder.completionDate && (
                <div>
                  <Label className="text-sm font-medium">Data de Conclusão</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(serviceOrder.completionDate)}</p>
                </div>
              )}
              {serviceOrder.deliveryDate && (
                <div>
                  <Label className="text-sm font-medium">Data de Entrega</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(serviceOrder.deliveryDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  )
}
