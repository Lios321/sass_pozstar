"use client"

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Verificar preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="rounded-xl hover:bg-accent/50 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
      aria-label={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {darkMode ? (
        <>
          <Sun className="h-5 w-5 text-yellow-500" />
          <span className="ml-2 text-sm font-medium">Escuro</span>
        </>
      ) : (
        <>
          <Moon className="h-5 w-5 text-slate-600" />
          <span className="ml-2 text-sm font-medium">Claro</span>
        </>
      )}
    </Button>
  )
}
