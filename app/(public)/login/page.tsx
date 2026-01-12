'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, LogIn, Wrench, Eye, EyeOff } from 'lucide-react'

function LoginInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const callbackParam = searchParams.get('callbackUrl')
  const targetUrl = (() => {
    if (callbackParam) {
      try {
        const u = new URL(callbackParam, typeof window !== 'undefined' ? window.location.origin : undefined)
        return u.href
      } catch {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        return `${origin}/dashboard`
      }
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/dashboard`
  })()

  useEffect(() => {
    if (status === 'authenticated') {
      if (typeof window !== 'undefined') {
        window.location.assign(targetUrl)
      } else {
        router.replace(targetUrl)
      }
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }
    
    setIsLoading(true)
    setError('')

    try {
      console.log('Attempting sign in...', { email, targetUrl })
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: targetUrl,
      })
      console.log('Sign in result:', result)

      if (!result || result.error) {
        console.error('Sign in failed:', result?.error)
        const friendly = result?.error === 'CredentialsSignin'
          ? 'Email ou senha inválidos'
          : 'Falha ao fazer login. Tente novamente.'
        setError(friendly)
        return
      }
      
      console.log('Sign in success, redirecting to:', targetUrl)
      if (typeof window !== 'undefined') {
        window.location.assign(targetUrl)
      } else {
        router.replace(targetUrl)
      }
    } catch (error) {
      console.error('Sign in exception:', error)
      setError(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5"></div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center slide-up">
          <div className="flex items-center justify-center mb-4">
            <Wrench className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance">
            Pozstar
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary-light mx-auto mb-4 rounded-full"></div>
          <p className="text-muted-foreground text-base sm:text-lg font-medium text-balance">
            Sistema de Gestão de Ordens de Serviço
          </p>
        </div>

        <Card className="card-modern backdrop-blur-xl bg-card/80 border-border/30 shadow-heavy slide-up" style={{animationDelay: '0.2s'}}>
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground text-balance">
              Entrar na sua conta
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm sm:text-base text-balance">
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 text-destructive px-4 py-3 rounded-xl backdrop-blur-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="email" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Email</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background/80 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/30 shadow-light"
                />
              </div>

              <div className="space-y-3">
                <label htmlFor="password" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Senha</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background/80 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/30 shadow-light pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 tap-target"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="h-5 w-5 mr-2" />
                    Entrar
                  </span>
                )}
              </button>
            </form>
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
