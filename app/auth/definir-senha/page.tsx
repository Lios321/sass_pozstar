'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo, useState, Suspense } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, CheckCircle2, XCircle, Wrench, Lock, LogIn } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function decodeEmail(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const json = JSON.parse(atob(parts[1]))
    return typeof json.email === 'string' ? json.email : null
  } catch {
    return null
  }
}

function DefinirSenhaInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const email = useMemo(() => (token ? decodeEmail(token) : null), [token])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasLength = password.length >= 8
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const strength = [hasLength, hasCase, hasNumber, hasSymbol].reduce((a, b) => a + (b ? 1 : 0), 0)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!token) {
      setError('Link inválido ou ausente')
      return
    }
    if (!hasLength || !hasCase || !hasNumber) {
      setError('Senha fraca. Use 8+ caracteres, maiúsculas, minúsculas e números')
      return
    }
    if (password !== confirm) {
      setError('Senhas não conferem')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const ct = res.headers.get('content-type') || ''
      let data: any = {}
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { error: 'Resposta inválida do servidor' }
        }
      }
      if (!res.ok) {
        setError(data.error || 'Falha ao definir senha')
      } else {
        setSuccess('Senha definida com sucesso')
        toast.success('Senha definida. Faça login para continuar.')
        setTimeout(() => router.push('/login'), 1200)
      }
    } catch {
      setError('Erro de rede')
    } finally {
      setLoading(false)
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
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance">Pozstar</h1>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary-light mx-auto mb-4 rounded-full"></div>
          <p className="text-muted-foreground text-base sm:text-lg font-medium text-balance">Sistema de Gestão de Ordens de Serviço</p>
        </div>
        <Card className="card-modern backdrop-blur-xl bg-card/80 border-border/30 shadow-heavy slide-up" style={{animationDelay: '0.2s'}}>
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground text-balance">Definir sua senha</CardTitle>
            <CardDescription className="text-muted-foreground text-sm sm:text-base text-balance">
              Crie sua senha para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {email && <div className="text-sm text-foreground">Conta: <span className="font-medium">{email}</span></div>}
            {!token && <div className="text-sm text-destructive">Link inválido. Solicite um novo convite.</div>}
            {error && (
              <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 text-destructive px-4 py-3 rounded-xl backdrop-blur-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 text-emerald-700 px-4 py-3 rounded-xl backdrop-blur-sm">
                {success}
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Nova senha</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background/80 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/30 shadow-light pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Mostrar senha"
                  >
                    {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Confirmar senha</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background/80 transition-all duration-300 text-foreground placeholder:text-muted-foreground hover:border-primary/30 shadow-light pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Mostrar confirmação"
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={[
                        'h-2 w-full rounded',
                        strength > i
                          ? i === 0
                            ? 'bg-red-500'
                            : i === 1
                            ? 'bg-orange-500'
                            : i === 2
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-gray-200',
                      ].join(' ')}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {hasLength ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span>8+ caracteres</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasCase ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span>Maiúsculas e minúsculas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasNumber ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span>Números</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasSymbol ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span>Caracteres especiais</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full btn-gradient py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 tap-target"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Salvando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="h-5 w-5 mr-2" />
                    Definir senha
                  </span>
                )}
              </button>
            </form>
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-primary hover:underline"
              >
                Voltar ao login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <DefinirSenhaInner />
    </Suspense>
  )
}
