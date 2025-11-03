'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Wrench, ClipboardList, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useRouter } from 'next/navigation';

interface RecentOrder {
  id: string;
  orderNumber: string;
  client: { name: string };
  equipmentType?: string;
  brand?: string;
  model?: string;
  status: string;
  createdAt: string;
}

interface OrdersByStatus {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface OrdersByMonth {
  month: string;
  count: number;
  [key: string]: unknown;
}

interface TechnicianPerformance {
  name: string;
  completedOrders: number;
  rating?: number;
  [key: string]: unknown;
}

interface DashboardStats {
  totalClients: number;
  totalTechnicians: number;
  totalServiceOrders: number;
  pendingOrders: number;
  completedOrders: number;
  recentOrders: RecentOrder[];
  ordersByStatus: OrdersByStatus[];
  ordersByMonth: OrdersByMonth[];
  technicianPerformance: TechnicianPerformance[];
  growthRate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (response.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
        router.push('/login');
        return;
      }
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('Falha ao buscar estatísticas', { status: response.status, body: bodyText?.slice(0, 500) });
        setError('Erro ao carregar estatísticas');
        return;
      }
      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Falha ao parsear JSON de estatísticas', e);
        setError('Erro ao carregar estatísticas');
        return;
      }
      setStats(data);
    } catch (error: unknown) {
      setError('Erro ao carregar dados do dashboard');
      console.warn('Aviso (dashboard):', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="pulse-primary w-16 h-16 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Erro</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDashboardStats}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="mb-8 backdrop-blur-sm bg-card/30 border border-border/50 rounded-lg p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio de consertos</p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="card-modern hover-lift fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-semibold text-foreground">{stats.totalClients}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern hover-lift fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Técnicos</p>
                <p className="text-2xl font-semibold text-foreground">{stats.totalTechnicians}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-xl">
                <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern hover-lift fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Ordens</p>
                <p className="text-2xl font-semibold text-foreground">{stats.totalServiceOrders}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl">
                <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern hover-lift fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-semibold text-foreground">{stats.pendingOrders}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern hover-lift fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-semibold text-foreground">{stats.completedOrders}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern hover-lift fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa Crescimento</p>
                <p className="text-2xl font-semibold text-foreground">+{stats.growthRate}%</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="card-modern hover-lift fade-in">
          <CardHeader>
            <CardTitle className="text-foreground">Ordens por Status</CardTitle>
            <CardDescription>Distribuição atual das ordens de serviço</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => {
                    const total = stats.ordersByStatus.reduce((sum, e) => sum + (e.value || 0), 0);
                    const pct = total ? ((entry.value / total) * 100) : 0;
                    return `${entry.name} ${pct.toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Month */}
        <Card className="card-modern hover-lift fade-in">
          <CardHeader>
            <CardTitle className="text-foreground">Receita Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.ordersByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Technician Performance */}
        <Card className="card-modern hover-lift fade-in lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground">Performance dos Técnicos</CardTitle>
            <CardDescription>Ordens concluídas por técnico no último mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.technicianPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar 
                  dataKey="completedOrders" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="card-modern hover-lift fade-in">
         <CardHeader>
           <CardTitle className="text-foreground">Ordens Recentes</CardTitle>
           <CardDescription>Últimas 5 ordens de serviço registradas</CardDescription>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentOrders.map((order, index) => (
              <div 
                key={order.id} 
                className="flex items-center justify-between p-4 border border-border/30 rounded-xl bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all duration-300 shadow-light hover:shadow-medium slide-in-left"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div>
                  <p className="font-medium text-foreground">#{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{order.client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {`${order.equipmentType || ''} ${order.brand || ''} ${order.model || ''}`.trim()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{order.status}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}