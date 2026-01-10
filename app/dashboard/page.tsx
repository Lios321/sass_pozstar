'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Wrench, ClipboardList, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
 

const Charts = dynamic(() => import('./components/Charts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" aria-busy="true" aria-live="polite">
      <Card className="card-modern hover-lift fade-in">
        <CardHeader>
          <CardTitle className="text-foreground">Carregando gráficos...</CardTitle>
          <CardDescription>Otimizando desempenho</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/20" />
        </CardContent>
      </Card>
      <Card className="card-modern hover-lift fade-in">
        <CardHeader>
          <CardTitle className="text-foreground">Carregando gráficos...</CardTitle>
          <CardDescription>Otimizando desempenho</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/20" />
        </CardContent>
      </Card>
    </div>
  ),
});

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

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
 

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const [chartsVisible, setChartsVisible] = useState(false);
  
  

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const el = chartsRef.current;
    if (!el || chartsVisible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setChartsVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [chartsVisible]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', { 
        credentials: 'include',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
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
      try {
        const { captureException } = await import('@/lib/monitoring');
        captureException(error, { scope: 'dashboard.fetch' });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  

  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800" role="status" aria-live="polite">
        <div className="text-center">
          <div className="pulse-primary w-16 h-16 mx-auto mb-4" aria-hidden="true"></div>
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
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 min-h-screen bg-background dark:bg-gradient-to-br dark:from-background dark:to-primary/5">
      {/* Header */}
      <div className="mb-8 backdrop-blur-sm bg-card border border-border/50 rounded-lg p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio de consertos</p>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div ref={chartsRef}>
        {chartsVisible ? (
          <Charts stats={stats} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" aria-busy="true" aria-live="polite">
            <Card className="card-modern hover-lift fade-in">
              <CardHeader>
                <CardTitle className="text-foreground">Gráficos</CardTitle>
                <CardDescription>Serão carregados ao rolar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/20" />
              </CardContent>
            </Card>
            <Card className="card-modern hover-lift fade-in">
              <CardHeader>
                <CardTitle className="text-foreground">Gráficos</CardTitle>
                <CardDescription>Serão carregados ao rolar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/20" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    </div>
  );
}
