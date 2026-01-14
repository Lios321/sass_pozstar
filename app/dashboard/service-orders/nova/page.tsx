'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ClientAutocomplete from '@/components/ui/client-autocomplete'
import ClientSummary from '@/components/ui/client-summary'
import { ArrowLeft, Save, User, Wrench, FileText, Calendar, Loader2, Plus, X, Package, AlertCircle, CheckCircle, Download } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  phone: string
}

interface FormData {
  clientId: string
  equipmentType: string
  brand: string
  model: string
  reportedDefect: string
  serialNumber: string
  accessories: string[]
  budgetNote: string
  arrivalDate: string
}

export default function NovaOrdemServicoPage() {
  const router = useRouter()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newAccessory, setNewAccessory] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    clientId: '',
    equipmentType: '',
    brand: '',
    model: '',
    reportedDefect: '',
    serialNumber: '',
    accessories: [],
    budgetNote: '',
    arrivalDate: ''
  })

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setFormData(prev => ({ ...prev, clientId: client.id }))
  }
  
  useEffect(() => {
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const clientId = sp.get('clientId')
      if (clientId && !selectedClient) {
        ;(async () => {
          try {
            const res = await fetch(`/api/clients/${clientId}`)
            if (res.ok) {
              const client: any = await res.json()
              handleClientSelect({
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
              })
            }
          } catch {}
        })()
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemoveClient = () => {
    setSelectedClient(null)
    setFormData(prev => ({ ...prev, clientId: '' }))
  }

  const addAccessory = () => {
    if (newAccessory.trim()) {
      setFormData(prev => ({
        ...prev,
        accessories: [...prev.accessories, newAccessory.trim()]
      }))
      setNewAccessory('')
    }
  }

  const removeAccessory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    // Validação dos campos obrigatórios
    if (!formData.clientId) {
      setErrorMessage('Por favor, selecione um cliente')
      setIsSubmitting(false)
      return
    }

    if (!formData.equipmentType.trim()) {
      setErrorMessage('Por favor, informe o tipo de equipamento')
      setIsSubmitting(false)
      return
    }

    if (!formData.reportedDefect.trim()) {
      setErrorMessage('Por favor, descreva o defeito relatado')
      setIsSubmitting(false)
      return
    }

    if (!formData.arrivalDate) {
      setErrorMessage('Por favor, informe a data de chegada')
      setIsSubmitting(false)
      return
    }

    try {
      const { accessories, ...formDataWithoutAccessories } = formData
      const dataToSend = {
        ...formDataWithoutAccessories,
        receivedAccessories: accessories.join(', ') // Converter array para string para compatibilidade com API
      }
      
      const response = await fetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData: any = await response.json()
        throw new Error(errorData.error || 'Erro ao criar ordem de serviço')
      }

      const responseData: any = await response.json()
      setCreatedOrderId(responseData.serviceOrder.id)
      // Mensagem visual removida; download será disparado automaticamente
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao criar ordem de serviço')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadReceipt = async () => {
    if (!createdOrderId) return

    try {
      const response = await fetch(`/api/service-orders/${createdOrderId}/receipt`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let errorMessage = 'Erro ao baixar comprovante'
        try {
          if (contentType.includes('application/json')) {
            const data: any = await response.json()
            errorMessage = data?.reason || data?.message || data?.error || errorMessage
          } else {
            const text = await response.text()
            errorMessage = text || errorMessage
          }
        } catch (_) {
          // ignore parse errors and use default message
        }
        console.error('Download de comprovante falhou:', response.status, errorMessage)
        setErrorMessage(errorMessage)
        return
      }

      // Criar blob e fazer download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      
      // Extrair nome do arquivo do header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'comprovante.pdf'
      a.download = filename
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Após iniciar o download, redireciona para a tabela de OS
      router.replace('/dashboard/service-orders')
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error)
      setErrorMessage('Erro ao baixar comprovante. Tente novamente.')
    }
  }

  // Dispara download automático quando a OS é criada
  const autoDownloadTriggered = useRef(false)
  useEffect(() => {
    if (createdOrderId && !autoDownloadTriggered.current) {
      autoDownloadTriggered.current = true
      void handleDownloadReceipt()
    }
  }, [createdOrderId])

  const resetForm = () => {
    setSelectedClient(null)
    setNewAccessory('')
    setErrorMessage('')
    setSuccessMessage('')
    setCreatedOrderId(null)
    setFormData({
      clientId: '',
      equipmentType: '',
      brand: '',
      model: '',
      reportedDefect: '',
      serialNumber: '',
      accessories: [],
      budgetNote: '',
      arrivalDate: ''
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/service-orders')}
                className="flex items-center space-x-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Ordem de Serviço</h1>
                <p className="text-gray-600 dark:text-gray-400">Cadastre uma nova ordem de serviço no sistema</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem de sucesso removida; download agora é automático */}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Cliente */}
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-6">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações do Cliente</h2>
            </div>
            
            <div className="space-y-4">
              <ClientAutocomplete
                onClientSelect={handleClientSelect}
                placeholder="Digite o nome do cliente..."
                label="Cliente"
                value={selectedClient?.name || ''}
                required={true}
              />
              
              {selectedClient && (
                <ClientSummary 
                  client={selectedClient} 
                  onRemove={handleRemoveClient}
                  showRemoveButton={true}
                />
              )}
            </div>
          </div>

          {/* Dados do Equipamento */}
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-6">
              <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados do Equipamento</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="equipmentType" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <Wrench className="h-4 w-4" />
                  <span>Tipo de Equipamento *</span>
                </Label>
                <Input
                  id="equipmentType"
                  type="text"
                  value={formData.equipmentType}
                  onChange={(e) => setFormData({...formData, equipmentType: e.target.value})}
                  placeholder="Ex: Notebook, Desktop, Impressora"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <Package className="h-4 w-4" />
                  <span>Marca</span>
                </Label>
                <Input
                  id="brand"
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="Ex: Dell, HP, Lenovo"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  <span>Modelo</span>
                </Label>
                <Input
                  id="model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="Ex: Inspiron 15, ThinkPad X1"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  <span>Número de Série</span>
                </Label>
                <Input
                  id="serialNumber"
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  placeholder="Número de série do equipamento"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Data de Chegada */}
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-6">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data de Chegada</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="arrivalDate" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                <span>Data de Chegada *</span>
              </Label>
              <Input
                id="arrivalDate"
                type="date"
                value={formData.arrivalDate}
                onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Sistema de Acessórios */}
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-6">
              <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Acessórios Recebidos</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={newAccessory}
                  onChange={(e) => setNewAccessory(e.target.value)}
                  placeholder="Ex: Cabo de energia, Fonte, Case, Bateria extra"
                  className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAccessory())}
                />
                <Button
                  type="button"
                  onClick={addAccessory}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {formData.accessories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Acessórios Adicionados:</Label>
                  <div className="space-y-2">
                    {formData.accessories.map((accessory, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <span className="text-gray-900 dark:text-white">{accessory}</span>
                        <Button
                          type="button"
                          onClick={() => removeAccessory(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detalhes do Serviço */}
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-6">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes do Serviço</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reportedDefect" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  <span>Defeito Relatado *</span>
                </Label>
                <Textarea
                  id="reportedDefect"
                  value={formData.reportedDefect}
                  onChange={(e) => setFormData({...formData, reportedDefect: e.target.value})}
                  placeholder="Descreva detalhadamente o problema relatado pelo cliente"
                  required
                  rows={4}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetNote" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  <span>Observações do Orçamento</span>
                </Label>
                <Textarea
                  id="budgetNote"
                  value={formData.budgetNote}
                  onChange={(e) => setFormData({...formData, budgetNote: e.target.value})}
                  placeholder="Observações sobre o orçamento"
                  rows={3}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-6 py-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Ordem de Serviço
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
