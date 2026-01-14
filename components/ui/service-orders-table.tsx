'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  User,
  Wrench,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calculator,
  ShoppingCart,
  RotateCcw,
  DollarSign,
  Smile,
  Truck
} from 'lucide-react';

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

interface ServiceOrdersTableProps {
  serviceOrders: ServiceOrder[];
  loading?: boolean;
  onView?: (serviceOrder: ServiceOrder) => void;
  onEdit?: (serviceOrder: ServiceOrder) => void;
  onDelete?: (id: string) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  totalRecords?: number;
  totalPages?: number;
  onItemsPerPageChange?: (limit: number) => void;
  // added controlled sorting props
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

type SortField = 'orderNumber' | 'clientName' | 'equipmentType' | 'brand' | 'status' | 'openingDate';
type SortDirection = 'asc' | 'desc';

// Define unified status type used across UI
<<<<<<< Updated upstream
import type { ServiceOrderStatus } from '@/lib/types';
=======
import { ServiceOrderStatus } from '@/lib/types';
>>>>>>> Stashed changes

const statusConfig: Record<ServiceOrderStatus, { label: string; icon: any; className: string }> = {
  SEM_VER: {
    label: 'Sem Ver',
    icon: EyeOff,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
  },
  ORCAMENTAR: {
    label: 'Orçamentar',
    icon: Calculator,
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
  },
  APROVADO: {
    label: 'Aprovado',
    icon: CheckCircle,
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
  },
  ESPERANDO_PECAS: {
    label: 'Esperando Peças',
    icon: Package,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
  },
  COMPRADO: {
    label: 'Comprado',
    icon: ShoppingCart,
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100'
  },
  MELHORAR: {
    label: 'Melhorar',
    icon: Wrench,
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
  },
  TERMINADO: {
    label: 'Terminado',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
  },
  SEM_PROBLEMA: {
    label: 'Sem Problema',
    icon: Smile,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
  },
  SEM_CONSERTO: {
    label: 'Sem Conserto',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
  },
  DEVOLVER: {
    label: 'Devolver',
    icon: RotateCcw,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
  },
  DEVOLVIDO: {
    label: 'Devolvido',
    icon: Truck,
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100'
  },
  DESCARTE: {
    label: 'Descarte',
    icon: Trash2,
    className: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'
  },
  VENDIDO: {
    label: 'Vendido',
    icon: DollarSign,
    className: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100'
  },
  ESPERANDO_CLIENTE: {
    label: 'Esperando Cliente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
  }
};

export function ServiceOrdersTable({
  serviceOrders,
  loading = false,
  onView,
  onEdit,
  onDelete,
  searchTerm = '',
  onSearchChange,
  currentPage = 1,
  onPageChange,
  itemsPerPage = 10,
  totalRecords = 0,
  totalPages = 1,
  onItemsPerPageChange,
  // new controlled sorting props
  sortField: controlledSortField,
  sortDirection: controlledSortDirection,
  onSortChange
}: ServiceOrdersTableProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchTerm);
  const [internalCurrentPage, setInternalCurrentPage] = useState(currentPage);
  // default sort to orderNumber desc
  const [internalSortField, setInternalSortField] = useState<SortField>('orderNumber');
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('desc');

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearchTerm(value);
    }
  };

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

  const activeSearchTerm = onSearchChange ? searchTerm : internalSearchTerm;
  const activeCurrentPage = onPageChange ? currentPage : internalCurrentPage;

  // resolve active sort values depending on controlled vs uncontrolled mode
  const activeSortField = onSortChange ? (controlledSortField ?? 'orderNumber') : internalSortField;
  const activeSortDirection = onSortChange ? (controlledSortDirection ?? 'desc') : internalSortDirection;

  const handleSort = (field: SortField) => {
    // toggle sort and reset to page 1
    if (onSortChange) {
      const newDirection: SortDirection =
        activeSortField === field ? (activeSortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
      onSortChange(field, newDirection);
    } else {
      const newDirection: SortDirection =
        internalSortField === field ? (internalSortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
      setInternalSortField(field);
      setInternalSortDirection(newDirection);
    }
    handlePageChange(1);
  };

  const getSortIcon = (field: SortField) => {
    if (activeSortField !== field) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    return activeSortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-primary" /> : 
      <ChevronDown className="h-4 w-4 text-primary" />;
  };

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (activeSortField !== field) return 'none';
    return activeSortDirection === 'asc' ? 'ascending' : 'descending';
  };

  // Filtrar e ordenar ordens de serviço (no modo servidor, não filtramos aqui)
  const filteredAndSortedServiceOrders = useMemo(() => {
    if (onSearchChange) {
      // Modo controlado/servidor: os dados já vêm filtrados/ordenados do backend
      return serviceOrders;
    }

    // Primeiro filtrar
    const filtered = serviceOrders.filter(order =>
      order.orderNumber.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      order.technician?.name.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      order.equipmentType.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      order.brand.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      order.model.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      statusConfig[order.status].label.toLowerCase().includes(activeSearchTerm.toLowerCase())
    );

    // Depois ordenar
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (activeSortField) {
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'clientName':
          aValue = a.client.name;
          bValue = b.client.name;
          break;
        case 'equipmentType':
          aValue = a.equipmentType;
          bValue = b.equipmentType;
          break;
        case 'brand':
          aValue = a.brand;
          bValue = b.brand;
          break;
        case 'status':
          aValue = statusConfig[a.status].label;
          bValue = statusConfig[b.status].label;
          break;
        case 'openingDate':
          aValue = new Date(a.openingDate).getTime();
          bValue = new Date(b.openingDate).getTime();
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' });
        return activeSortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return activeSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [serviceOrders, activeSearchTerm, activeSortField, activeSortDirection, onSearchChange]);

  // Dados e métricas de paginação
  const computedTotalPages = Math.ceil(filteredAndSortedServiceOrders.length / itemsPerPage);
  const displayedTotalPages = onPageChange ? totalPages : computedTotalPages;
  const startIndex = (activeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServiceOrders = onPageChange 
    ? serviceOrders 
    : filteredAndSortedServiceOrders.slice(startIndex, endIndex);

  const countTotal = onPageChange ? totalRecords : filteredAndSortedServiceOrders.length;
  const countStart = countTotal === 0 ? 0 : (activeCurrentPage - 1) * itemsPerPage + 1;
  const countEnd = Math.min(activeCurrentPage * itemsPerPage, countTotal);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-background/50 backdrop-blur-sm border border-border/20 rounded-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Label htmlFor="search" className="text-sm font-medium sm:whitespace-nowrap">Buscar:</Label>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Digite o número da OS, cliente, equipamento..."
              value={activeSearchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="text-sm text-muted-foreground sm:whitespace-nowrap">
            Exibindo {countStart}-{countEnd} de {countTotal} registros
          </div>
        </div>
         
         {/* Pagination moved to bottom */}
       </div>

      {/* Service Orders Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lista de Ordens de Serviço</h2>
          <p className="text-sm text-muted-foreground">
            Mostrando {countStart}-{countEnd} de {countTotal} ordem(ns)
          </p>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm shadow-sm">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border/30">
                <tr>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">
                    <button
                      onClick={() => handleSort('orderNumber')}
                      className="flex items-center justify-center gap-2 w-full hover:text-primary transition-colors duration-200"
                      aria-sort={getAriaSort('orderNumber')}
                      title="Ordenar por Número OS"
                    >
                      Número OS
                      {getSortIcon('orderNumber')}
                    </button>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">
                    <button
                      onClick={() => handleSort('clientName')}
                      className="flex items-center justify-center gap-2 w-full hover:text-primary transition-colors duration-200"
                      aria-sort={getAriaSort('clientName')}
                      title="Ordenar por Cliente"
                    >
                      Cliente
                      {getSortIcon('clientName')}
                    </button>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">
                    <button
                      onClick={() => handleSort('equipmentType')}
                      className="flex items-center justify-center gap-2 w-full hover:text-primary transition-colors duration-200"
                      aria-sort={getAriaSort('equipmentType')}
                      title="Ordenar por Equipamento"
                    >
                      Equipamento
                      {getSortIcon('equipmentType')}
                    </button>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">
                    <button
                      onClick={() => handleSort('brand')}
                      className="flex items-center justify-center gap-2 w-full hover:text-primary transition-colors duration-200"
                      aria-sort={getAriaSort('brand')}
                      title="Ordenar por Marca/Modelo"
                    >
                      Marca/Modelo
                      {getSortIcon('brand')}
                    </button>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center justify-center gap-2 w-full hover:text-primary transition-colors duration-200"
                      aria-sort={getAriaSort('status')}
                      title="Ordenar por Status"
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">
                    <button
                      onClick={() => handleSort('openingDate')}
                      className="flex items-center justify-center gap-2 w-full hover:text-primary transition-colors duration-200"
                      aria-sort={getAriaSort('openingDate')}
                      title="Ordenar por Data de Abertura"
                    >
                      Data Abertura
                      {getSortIcon('openingDate')}
                    </button>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-foreground/90 text-sm uppercase tracking-wide">Ações</th>
                </tr>
                </thead>
              <tbody className="divide-y divide-border/20">
                {paginatedServiceOrders.map((order, index) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <tr 
                      key={order.id}
                      className={`
                        ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} 
                        hover:bg-primary/5 hover:shadow-sm transition-all duration-300 group
                        border-l-4 border-l-transparent hover:border-l-primary/30
                      `}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                          {order.orderNumber}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="truncate max-w-[150px] font-medium">{order.client.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-foreground font-medium group-hover:text-primary transition-colors duration-200">
                          {order.equipmentType}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                          <div className="font-medium">{order.brand}</div>
                          <div className="text-sm text-muted-foreground/70">{order.model}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${statusConfig[order.status].className}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig[order.status].label}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{new Date(order.openingDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex gap-1">
                          {onView && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(order)}
                              className="h-9 w-9 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 hover:shadow-md"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(order)}
                              className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110 hover:shadow-md"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(order.id)}
                              className="h-9 w-9 p-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110 hover:shadow-md"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {paginatedServiceOrders.map((order, index) => {
            const StatusIcon = statusConfig[order.status].icon;
            return (
              <div 
                key={order.id}
                className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-xl p-5 hover:bg-primary/5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 slide-in-left"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg mb-2">{order.orderNumber}</h3>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${statusConfig[order.status].className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig[order.status].label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(order)}
                        className="h-9 w-9 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 hover:shadow-md"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(order)}
                        className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110 hover:shadow-md"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(order.id)}
                        className="h-9 w-9 p-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110 hover:shadow-md"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-foreground/80">Cliente</span>
                      <div className="text-foreground font-semibold">{order.client.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-foreground/80">Equipamento</span>
                      <div className="text-foreground font-semibold">
                        {order.equipmentType}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {order.brand} {order.model}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <span className="font-medium text-foreground/80 text-xs">Abertura</span>
                        <div className="text-foreground font-semibold text-sm">
                          {new Date(order.openingDate).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination (bottom) */}
      {displayedTotalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border/20 space-y-4 sm:space-y-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground order-first sm:order-none">
            <span>Página</span>
            <span className="font-medium text-foreground">{activeCurrentPage}</span>
            <span>de</span>
            <span className="font-medium text-foreground">{displayedTotalPages}</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={activeCurrentPage === 1}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Primeira"
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(activeCurrentPage - 1, 1))}
              disabled={activeCurrentPage === 1}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="hidden sm:flex items-center space-x-1">
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const maxButtons = 5;
                const add = (p: number) => pages.push(p);
                const showRange = (start: number, end: number) => {
                  for (let p = start; p <= end; p++) add(p);
                };
                if (displayedTotalPages <= maxButtons + 2) {
                  showRange(1, displayedTotalPages);
                } else {
                  const left = Math.max(2, activeCurrentPage - 1);
                  const right = Math.min(displayedTotalPages - 1, activeCurrentPage + 1);
                  add(1);
                  if (left > 2) pages.push('ellipsis');
                  showRange(left, right);
                  if (right < displayedTotalPages - 1) pages.push('ellipsis');
                  add(displayedTotalPages);
                }
                return pages.map((p, idx) => {
                  if (p === 'ellipsis') {
                    return (
                      <span key={`e-${idx}`} className="px-2 text-muted-foreground">...</span>
                    );
                  }
                  const isActive = p === activeCurrentPage;
                  return (
                    <Button
                      key={p}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 p-0 rounded-md ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10 hover:text-primary'}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {p}
                    </Button>
                  );
                });
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(activeCurrentPage + 1, displayedTotalPages))}
              disabled={activeCurrentPage === displayedTotalPages}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Próxima"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(displayedTotalPages)}
              disabled={activeCurrentPage === displayedTotalPages}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              title="Última"
            >
              Última
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="per-page" className="text-sm">Por página</Label>
              <select
                id="per-page"
                value={itemsPerPage}
                onChange={(e) => {
                  const limit = parseInt(e.target.value, 10);
                  onItemsPerPageChange?.(limit);
                  handlePageChange(1);
                }}
                className="h-9 rounded-md border border-border/30 bg-background px-3 text-sm hover:border-border focus:ring-2 focus:ring-primary/20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedServiceOrders.length === 0 && (
        <div className="bg-background/50 backdrop-blur-sm border border-border/20 rounded-lg p-6">
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhuma ordem de serviço encontrada
            </p>
            <p className="text-muted-foreground">
              {activeSearchTerm 
                ? `Não encontramos ordens de serviço que correspondam a "${activeSearchTerm}"`
                : 'Ainda não há ordens de serviço cadastradas no sistema'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}