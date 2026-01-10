"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, User, ChevronDown, Pencil } from "lucide-react"
import { signOut } from "next-auth/react"

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      const target = e.target as Node
      if (!ref.current.contains(target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Conta</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 ui-menu"
        >
          <Link
            href="/dashboard"
            className="ui-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/account"
            className="ui-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-4 w-4" />
            <span>Editar Perfil</span>
          </Link>
          <button
            className="ui-menu-item text-destructive"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  )
}
