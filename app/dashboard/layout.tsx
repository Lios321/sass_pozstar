'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NotificationBell } from '@/components/ui/notification-bell';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  ClipboardList, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-600 dark:text-blue-400' },
  { name: 'Clientes', href: '/dashboard/clients', icon: Users, color: 'text-green-600 dark:text-green-400' },
  { name: 'Técnicos', href: '/dashboard/technicians', icon: Wrench, color: 'text-purple-600 dark:text-purple-400' },
  { name: 'Ordens de Serviço', href: '/dashboard/service-orders', icon: ClipboardList, color: 'text-orange-600 dark:text-orange-400' },
  { name: 'Relatórios', href: '/dashboard/reports', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'Configurações', href: '/dashboard/settings', icon: Settings, color: 'text-emerald-600 dark:text-emerald-400' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    // Obter userId da sessão do Auth.js, se disponível
    if (session?.user) {
      const sUser = session.user as { id?: string };
      setUserId(sUser.id || null);
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/login' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-r border-border/30 shadow-heavy transform transition-all duration-500 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:h-screen slide-in-left
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between h-16 px-6 border-b border-border/30 bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 backdrop-blur-sm">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              Pozstar
            </h1>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden hover:bg-primary/20 hover:scale-110 transition-all duration-300"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="px-3 py-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                // Lógica mais precisa para detectar o link ativo
                const isActive = item.href === '/dashboard' 
                  ? pathname === '/dashboard' 
                  : pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start transition-all duration-300 group relative overflow-hidden fade-in ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary/30 to-primary/20 text-primary border-l-4 border-primary shadow-lg backdrop-blur-sm font-medium' 
                        : 'text-muted-foreground hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 hover:text-primary hover:shadow-light hover:scale-[1.02]'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className={`mr-3 h-4 w-4 transition-all duration-300 ${
                      isActive ? item.color : `group-hover:scale-110 ${item.color}`
                    }`} />
                    <span className="transition-all duration-300">{item.name}</span>
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                    )}
                  </Button>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto p-3 border-t border-border/30 bg-gradient-to-r from-muted/20 via-primary/5 to-muted/20 backdrop-blur-sm">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start group hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 hover:text-primary hover:shadow-light hover:scale-[1.02] transition-all duration-300"
                onClick={toggleTheme}
              >
                {darkMode ? (
                  <Sun className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-300 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Moon className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-300 text-slate-600 dark:text-slate-400" />
                )}
                <span className="transition-all duration-300">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start group text-destructive hover:text-destructive hover:bg-gradient-to-r hover:from-destructive/15 hover:to-destructive/5 hover:shadow-light hover:scale-[1.02] transition-all duration-300"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-300 text-red-600 dark:text-red-400" />
                <span className="transition-all duration-300">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-b border-border/30 px-4 py-3 lg:px-6 shadow-medium">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 hover:text-primary hover:scale-110 transition-all duration-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="lg:hidden hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 hover:text-primary hover:scale-110 transition-all duration-300"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6 bg-gradient-to-br from-background via-background/95 to-primary/5 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}