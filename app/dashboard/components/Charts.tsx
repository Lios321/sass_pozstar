'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, CartesianGrid, XAxis, YAxis, Line, BarChart, Bar } from 'recharts';

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

function StatusPieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const name = p?.name ?? p?.payload?.name ?? '';
  const value = p?.value ?? p?.payload?.value ?? 0;
  const total = (p?.payload?.all ?? []).reduce((sum: number, e: any) => sum + (e.value || 0), 0);
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="ui-tooltip space-y-1">
      <div className="text-sm leading-5 font-medium text-foreground">{name}</div>
      <div className="text-sm leading-5 text-muted-foreground">Quantidade: {value}</div>
      <div className="text-sm leading-5 text-muted-foreground">Percentual: {pct}%</div>
    </div>
  );
}

function TechnicianBarTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="ui-tooltip">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground">Ordens concluídas: {p?.value ?? 0}</div>
    </div>
  );
}

export default function Charts({ stats }: { stats: DashboardStats }) {
  const [activeStatusIndex, setActiveStatusIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card className="card-modern hover-lift fade-in">
        <CardHeader>
          <CardTitle className="text-foreground">Ordens por Status</CardTitle>
          <CardDescription>Distribuição atual das ordens de serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
              <Pie
                data={stats.ordersByStatus.map(e => ({ ...e, all: stats.ordersByStatus }))}
                cx="50%"
                cy="50%"
                labelLine
                label={(props: any) => {
                  const RAD = Math.PI / 180;
                  const { cx, cy, midAngle, outerRadius, name, value, index } = props;
                  if (index === activeStatusIndex) return null;
                  const total = stats.ordersByStatus.reduce((sum, e) => sum + (e.value || 0), 0);
                  const pct = total ? (value / total) * 100 : 0;
                  const r = (outerRadius || 0) + 14;
                  const x = cx + r * Math.cos(-midAngle * RAD);
                  const y = cy + r * Math.sin(-midAngle * RAD);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill={'hsl(var(--foreground))'}
                      fontSize={12}
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {`${name} ${pct.toFixed(0)}%`}
                    </text>
                  );
                }}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                onMouseEnter={(_: any, i: number) => setActiveStatusIndex(i)}
                onMouseLeave={() => setActiveStatusIndex(null)}
              >
                {stats.ordersByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={<StatusPieTooltip />} 
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                  backgroundColor: 'hsl(var(--accent))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-medium)'
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
                content={<TechnicianBarTooltip />}
                wrapperStyle={{ outline: 'none' }}
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
  );
}

