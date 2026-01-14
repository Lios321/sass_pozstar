'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toast } from '@/lib/toast';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  _count: {
    serviceOrders: number;
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      if (sp.get('success') === 'created') {
        setSuccess('Cliente cadastrado com sucesso!');
        router.replace('/dashboard/clients');
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    fetchClients();
  }, [currentPage, itemsPerPage, searchTerm]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (searchTerm) {
        params.set('search', searchTerm);
      }
      const response = await fetch(`/api/clients?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
      }
      const data: any = await response.json();
      setClients(data.clients);
      const total = data.pagination?.total ?? data.total ?? 0;
      const pages = (data.pagination?.pages ?? Math.ceil(total / itemsPerPage)) || 1;
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (error) {
      setError('Erro ao carregar clientes');
      console.error('Erro:', error);
      Toast.apiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar cliente');
      }

      setSuccess(editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
      Toast.success(editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
      setShowForm(false);
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
      fetchClients();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      Toast.apiError(error);
    }
  };

  const handleEdit = (client: Client) => {
    router.push(`/dashboard/clients/${client.id}/edit`);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir cliente');
      }

      setSuccess('Cliente excluído com sucesso!');
      Toast.success('Cliente excluído com sucesso!');
      fetchClients();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      Toast.apiError(error);
    }
  };

  // Server-side search e paginação são tratadas via parâmetros da API

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes do sistema</p>
        </div>
        <Button onClick={() => router.push('/dashboard/clients/new')}>
          <Plus className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
          Novo Cliente
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="bg-background/50 backdrop-blur-sm border border-border/20 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <Label htmlFor="search" className="text-sm font-medium">Buscar:</Label>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600 dark:text-green-400" />
            <Input
              id="search"
              type="text"
              placeholder="Digite o nome, email, telefone ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Exibindo {totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalRecords)} de {totalRecords} cliente(s)
          </div>
        </div>
         
         {/* Pagination */}
         {totalPages > 1 && (
           <div className="flex items-center justify-between pt-4 border-t border-border/20">
             <div className="text-sm text-muted-foreground">
               Página {currentPage} de {totalPages}
             </div>
             <div className="flex items-center space-x-2">
               <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                 <SelectTrigger className="w-[110px]">
                   <SelectValue placeholder="Por página" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="5">5</SelectItem>
                   <SelectItem value="10">10</SelectItem>
                   <SelectItem value="20">20</SelectItem>
                   <SelectItem value="50">50</SelectItem>
                 </SelectContent>
               </Select>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                 disabled={currentPage === 1}
                 className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
               >
                 <ChevronLeft className="h-4 w-4" />
                 Anterior
               </Button>
               
               <div className="flex items-center space-x-1">
                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                   const pageNumber = i + 1
                   const isActive = pageNumber === currentPage
                   return (
                     <Button
                       key={pageNumber}
                       variant={isActive ? "default" : "outline"}
                       size="sm"
                       onClick={() => setCurrentPage(pageNumber)}
                       className={`w-8 h-8 p-0 transition-all duration-200 ${
                         isActive 
                           ? 'bg-primary text-primary-foreground' 
                           : 'hover:bg-primary/10 hover:text-primary'
                       }`}
                     >
                       {pageNumber}
                     </Button>
                   )
                 })}
               </div>
               
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                 disabled={currentPage === totalPages}
                 className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
               >
                 Próxima
                 <ChevronRight className="h-4 w-4" />
               </Button>
             </div>
           </div>
         )}
       </div>

      {/* Client Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
            <CardDescription>
              {editingClient ? 'Atualize as informações do cliente' : 'Adicione um novo cliente ao sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingClient ? 'Atualizar' : 'Criar'} Cliente
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingClient(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lista de Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalRecords)} de {totalRecords} cliente(s)
          </p>
        </div>
        <div>
          <div className="overflow-x-soft">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Data Cadastro</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Telefone</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Endereço</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Ordens</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr 
                    key={client.id}
                    className="border-b border-border/20 hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 group slide-in-left"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {client.name}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="truncate max-w-[200px]">{client.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span>{client.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="truncate max-w-[200px]">
                          {client.address || 'Não informado'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {client._count.serviceOrders}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                        >
                          <Edit className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {clients.length === 0 && (
        <div className="bg-background/50 backdrop-blur-sm border border-border/20 rounded-lg p-6">
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhum cliente encontrado
            </p>
            <p className="text-muted-foreground">
              {searchTerm 
                ? `Não encontramos clientes que correspondam a "${searchTerm}"`
                : 'Ainda não há clientes cadastrados no sistema'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
