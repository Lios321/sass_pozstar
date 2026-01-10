'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'

export default function AccountPage() {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/account')
        if (res.ok) {
          const json = await res.json()
          setName(json.data.name || '')
          setEmail(json.data.email || '')
        } else {
          setError('Não foi possível carregar seus dados')
        }
      } catch {
        setError('Erro ao carregar seus dados')
      }
    }
    load()
  }, [])

  const save = async () => {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          email: email || undefined,
          password: password || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Falha ao salvar alterações')
      }
      setMessage('Dados atualizados com sucesso')
      setPassword('')
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground">Atualize seu nome, email e senha</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Informações do Usuário</CardTitle>
          <CardDescription>Edite seus dados pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <div className="text-emerald-600 text-sm">{message}</div>}
          {error && <div className="text-destructive text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Opcional" />
          </div>

          <Button onClick={save} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

