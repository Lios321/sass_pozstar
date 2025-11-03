'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Mail, Lock, LogIn, Wrench } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação básica
    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }
    
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      })

      // Mapeia erros do NextAuth para mensagens amigáveis
      if (!result || result.error) {
        const friendly = result?.error === 'CredentialsSignin'
          ? 'Email ou senha inválidos'
          : 'Falha ao fazer login. Tente novamente.'
        setError(friendly)
        return
      }

      router.replace('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Fundo com gradiente dark moderno */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"></div>
      
      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Botão de toggle de tema no canto superior direito */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center slide-up">
          <div className="flex items-center justify-center mb-4">
            <Wrench className="h-12 w-12 text-blue-600 dark:text-blue-400 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">
              Pozstar
            </h1>
          </div>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary-light mx-auto mb-4 rounded-full"></div>
          <p className="text-muted-foreground text-lg font-medium">
            Sistema de Gestão de Ordens de Serviço
          </p>
        </div>

        <Card className="card-modern backdrop-blur-xl bg-card/80 border-border/30 shadow-heavy slide-up" style={{animationDelay: '0.2s'}}>
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground">
              Entrar na sua conta
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
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
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                  <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span>Senha</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background/80 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/30 shadow-light"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
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

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <button
                  onClick={() => router.push('/client-area')}
                  className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 hover:underline"
                >
                  Registre-se
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}