'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/site-header';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  ClipboardList, 
  FileText, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-primary' },
  { name: 'Clientes', href: '/dashboard/clients', icon: Users, color: 'text-primary' },
  { name: 'Técnicos', href: '/dashboard/technicians', icon: Wrench, color: 'text-primary' },
  { name: 'Ordens de Serviço', href: '/dashboard/service-orders', icon: ClipboardList, color: 'text-primary' },
  { name: 'Relatórios', href: '/dashboard/reports', icon: FileText, color: 'text-primary' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === 'ADMIN';
  const navItems = isAdmin
    ? [
        ...navigation,
        { name: 'Users', href: '/dashboard/users', icon: Users, color: 'text-primary' },
      ]
    : navigation;

  useEffect(() => {
    // Obter userId da sessão do Auth.js, se disponível
    if (session?.user) {
      const sUser = session.user as { id?: string };
      setUserId(sUser.id || null);
    }

  }, [router]);

  

  

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-background dark:via-background/95 dark:to-primary/5">
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
          fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-16' : 'w-64'} bg-card dark:bg-gradient-to-b dark:from-card/95 dark:via-card/90 dark:to-card/95 backdrop-blur-xl border-r border-border/30 shadow-heavy transform transition-all duration-500 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:h-screen slide-in-left
        `}
      >
        <div className="flex h-full flex-col">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} h-16 border-b border-border/30 bg-card dark:bg-gradient-to-r dark:from-primary/20 dark:via-primary/15 dark:to-primary/10 backdrop-blur-sm`}>
            {isCollapsed ? (
              <div 
                className="relative h-8 w-8 cursor-pointer hover:scale-110 transition-transform"
                onClick={() => setIsCollapsed(false)}
              >
                <Image src="/logo.png?v=2" alt="Pozstar" fill className="object-contain" priority />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8">
                    <Image src="/logo.png?v=2" alt="Pozstar" fill className="object-contain" priority />
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                    Pozstar
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex hover:bg-primary/20 transition-all duration-300"
                    onClick={() => setIsCollapsed(true)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden hover:bg-primary/20 hover:scale-110 transition-all duration-300"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {isCollapsed ? (
            <nav className="px-2 py-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);
                  return (
                    <Button
                      key={item.name}
                      variant={isActive ? 'secondary' : 'ghost'}
                      aria-label={item.name}
                      className={`w-full justify-center transition-all duration-300 group relative overflow-hidden fade-in ${
                        isActive
                          ? 'bg-primary/20 text-primary shadow-lg backdrop-blur-sm'
                          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow-light'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => {
                        router.push(item.href);
                        setSidebarOpen(false);
                      }}
                    >
                      <Icon
                        className={`h-5 w-5 transition-all duration-300 ${
                          isActive ? item.color : `group-hover:scale-110 ${item.color}`
                        }`}
                      />
                      <span className="sr-only">{item.name}</span>
                    </Button>
                  );
                })}
              </div>
            </nav>
          ) : (
            <nav className="px-3 py-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                {navItems.map((item, index) => {
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
          )}

          
        </div>
      </div>

      {/* Main content */}
      <div className={`${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'} safe-bottom`}>
        <SiteHeader onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="p-4 lg:p-6 bg-background dark:bg-gradient-to-br dark:from-background dark:via-background/95 dark:to-primary/5 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
