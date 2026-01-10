"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useSession } from "next-auth/react"
import UserMenu from "@/components/user-menu"
import { useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { NotificationBell } from "@/components/ui/notification-bell"

export default function SiteHeader({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { data } = useSession()
  const user = data?.user
  const router = useRouter()
  const displayName =
    (user as any)?.name ||
    ((user as any)?.email ? String((user as any).email).split("@")[0] : "Usuário")

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b bg-card/70">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menu"
            className="lg:hidden p-2 rounded-md hover:bg-primary/15 transition"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5 text-primary" />
          </button>
          <Link href="/" className="font-semibold tracking-tight bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Pozstar
          </Link>
          <span className="text-sm text-muted-foreground">
            Bem-vindo{user ? `, ${String(displayName).split(' ')[0]}` : ''}
          </span>
        </div>
        <nav className="flex items-center gap-3" role="navigation" aria-label="Principal">
          <ThemeToggle />
          {user ? <NotificationBell userId={(user as any)?.id} /> : null}
          {user ? <UserMenu /> : null}
          
        </nav>
      </div>
    </header>
  )
}
