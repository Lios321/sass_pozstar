'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Edit, Trash2, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toast } from '@/lib/toast';

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string[] | string;
  isAvailable: boolean;
  createdAt: string;
  _count: {
    serviceOrders: number;
  };
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isAvailable: true
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTechnicians();
  }, [currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (searchTerm) {
        params.set('search', searchTerm);
      }
      const response = await fetch(`/api/technicians?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar técnicos');
      }
      const data: any = await response.json();
      setTechnicians(data.technicians);
      const total = data.pagination?.total ?? data.total ?? 0;
      const pages = (data.pagination?.pages ?? Math.ceil(total / itemsPerPage)) || 1;
      setTotalRecords(total);
      setTotalPages(pages);
    } catch (error) {
      setError('Erro ao carregar técnicos');
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
      const url = editingTechnician ? `/api/technicians/${editingTechnician.id}` : '/api/technicians';
      const method = editingTechnician ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar técnico');
      }

      setSuccess(editingTechnician ? 'Técnico atualizado com sucesso!' : 'Técnico criado com sucesso!');
      Toast.success(editingTechnician ? 'Técnico atualizado com sucesso!' : 'Técnico criado com sucesso!');
      setShowForm(false);
      setEditingTechnician(null);
      setFormData({ name: '', email: '', phone: '', isAvailable: true });
      fetchTechnicians();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      Toast.apiError(error);
    }
  };

  const handleEdit = (technician: Technician) => {
    setEditingTechnician(technician);
    setFormData({
      name: technician.name,
      email: technician.email,
      phone: technician.phone,
      isAvailable: technician.isAvailable
    });
    setShowForm(true);
  };

  const handleDelete = async (technicianId: string) => {
    if (!confirm('Tem certeza que deseja excluir este técnico?')) {
      return;
    }

    try {
      const response = await fetch(`/api/technicians/${technicianId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir técnico');
      }

      setSuccess('Técnico excluído com sucesso!');
      Toast.success('Técnico excluído com sucesso!');
      fetchTechnicians();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      Toast.apiError(error);
    }
  };

  const toggleAvailability = async (technicianId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/technicians/${technicianId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar disponibilidade');
      }

      fetchTechnicians();
      Toast.success('Disponibilidade atualizada com sucesso!');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      Toast.apiError(error);
    }
  };

  // Busca e paginação são realizadas no servidor

  

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
          <h1 className="text-3xl font-bold">Gestão de Técnicos</h1>
          <p className="text-muted-foreground">Gerencie os técnicos do sistema</p>
        </div>
        <Button onClick={() => {
          setShowForm(true);
          setEditingTechnician(null);
          setFormData({ name: '', email: '', phone: '', isAvailable: true });
        }}>
          <Plus className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
          Novo Técnico
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
      <Card>
        <CardHeader>
          <CardTitle>Buscar Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-green-600 dark:text-green-400" />
            <Input
              placeholder="Buscar por nome, email, telefone ou especialização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Technician Form */}
      {showForm && (
        <Card>
      <CardHeader>
        <CardTitle>{editingTechnician ? 'Editar Técnico' : 'Novo Técnico'}</CardTitle>
        <CardDescription>
          {editingTechnician ? 'Atualize as informações do técnico' : 'Adicione um novo técnico ao sistema'}
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
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isAvailable">Disponível para novos serviços</Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              {editingTechnician ? 'Atualizar' : 'Criar'} Técnico
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowForm(false);
                setEditingTechnician(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
        </Card>
      )}

      {/* Technicians List */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lista de Técnicos</h2>
          <p className="text-sm text-muted-foreground">
            Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalRecords)} de {totalRecords} técnico(s)
          </p>
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
              const pageNumber = i + 1;
              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={pageNumber === currentPage ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10 hover:text-primary'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {technicians.map((technician) => (
          <Card key={technician.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {technician.name}
                  </CardTitle>
                  <CardDescription>
                    Técnico desde {new Date(technician.createdAt).toLocaleDateString('pt-BR')}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(technician)}
                  >
                    <Edit className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(technician.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>{technician.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>{technician.phone}</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {technician._count.serviceOrders} ordem(ns) de serviço
                </span>
                
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {technicians.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum técnico encontrado com os critérios de busca.' : 'Nenhum técnico cadastrado ainda.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
