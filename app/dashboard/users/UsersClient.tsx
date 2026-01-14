'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Search } from 'lucide-react'

type User = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'TECHNICIAN' | 'CLIENT'
  createdAt: string
}

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)
  const [openEditId, setOpenEditId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const [formCreate, setFormCreate] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TECHNICIAN' as 'ADMIN' | 'TECHNICIAN' | 'CLIENT',
  })

  const [formEdit, setFormEdit] = useState({
    name: '',
    email: '',
    role: 'TECHNICIAN' as 'ADMIN' | 'TECHNICIAN' | 'CLIENT',
    password: '',
  })

  const fetchUsers = async (params?: { page?: number; q?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const sp = new URLSearchParams()
      sp.set('page', String(params?.page ?? page))
      sp.set('pageSize', '10')
      if (params?.q ?? q) sp.set('q', params?.q ?? q)
      const res = await fetch(`/api/users?${sp.toString()}`)
      const json: any = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao carregar usuários')
      setUsers(json.data || [])
      setTotalPages(json.pagination?.totalPages || 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    setMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearch = async () => {
    setPage(1)
    await fetchUsers({ page: 1, q })
  }

  const onCreate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCreate),
      })
      const json: any = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao criar usuário')
      setOpenCreate(false)
      setFormCreate({ name: '', email: '', password: '', role: 'TECHNICIAN' })
      await fetchUsers()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (u: User) => {
    setOpenEditId(u.id)
    setFormEdit({ name: u.name, email: u.email, role: u.role, password: '' })
  }

  const onEdit = async () => {
    if (!openEditId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/users/${openEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEdit),
      })
      const json: any = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao atualizar usuário')
      setOpenEditId(null)
      setFormEdit({ name: '', email: '', role: 'TECHNICIAN', password: '' })
      await fetchUsers()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Remover este usuário?')) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      const json: any = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao remover usuário')
      await fetchUsers()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const currentEditing = useMemo(
    () => users.find((u) => u.id === openEditId) || null,
    [users, openEditId]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="pl-9 w-80"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="secondary" onClick={onSearch}>
            Buscar
          </Button>
        </div>
        {mounted && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-primary shadow-md hover:shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                  Novo Usuário
                </DialogTitle>
                <DialogDescription>Preencha os dados abaixo.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formCreate.name}
                    onChange={(e) =>
                      setFormCreate((s) => ({ ...s, name: e.target.value }))
                    }
                    className="focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formCreate.email}
                    onChange={(e) =>
                      setFormCreate((s) => ({ ...s, email: e.target.value }))
                    }
                    className="focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formCreate.password}
                    onChange={(e) =>
                      setFormCreate((s) => ({ ...s, password: e.target.value }))
                    }
                    className="focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select
                    value={formCreate.role}
                    onValueChange={(v) =>
                      setFormCreate((s) => ({
                        ...s,
                        role: v as 'ADMIN' | 'TECHNICIAN' | 'CLIENT',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="TECHNICIAN">TECHNICIAN</SelectItem>
                      <SelectItem value="CLIENT">CLIENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button onClick={onCreate}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-0 overflow-hidden shadow-medium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-card/95 via-card/90 to-card/95">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Perfil</th>
                <th className="text-left px-4 py-3">Criado em</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        u.role === 'ADMIN'
                          ? 'default'
                          : u.role === 'TECHNICIAN'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(u)} className="hover:scale-[1.02] transition-transform">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(u.id)}
                        className="text-destructive hover:text-destructive hover:scale-[1.02] transition-transform"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t bg-card/60">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={async () => {
                const p = page - 1
                setPage(p)
                await fetchUsers({ page: p })
              }}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              disabled={page >= totalPages}
              onClick={async () => {
                const p = page + 1
                setPage(p)
                await fetchUsers({ page: p })
              }}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Alert className="border-destructive/50">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mounted && (
        <Dialog open={!!openEditId} onOpenChange={(o) => !o && setOpenEditId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Editar Usuário
              </DialogTitle>
              <DialogDescription>Atualize os dados necessários.</DialogDescription>
            </DialogHeader>
            {currentEditing && (
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ename">Nome</Label>
                  <Input
                    id="ename"
                    value={formEdit.name}
                    onChange={(e) =>
                      setFormEdit((s) => ({ ...s, name: e.target.value }))
                    }
                    className="focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eemail">Email</Label>
                  <Input
                    id="eemail"
                    type="email"
                    value={formEdit.email}
                    onChange={(e) =>
                      setFormEdit((s) => ({ ...s, email: e.target.value }))
                    }
                    className="focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select
                    value={formEdit.role}
                    onValueChange={(v) =>
                      setFormEdit((s) => ({
                        ...s,
                        role: v as 'ADMIN' | 'TECHNICIAN' | 'CLIENT',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="TECHNICIAN">TECHNICIAN</SelectItem>
                      <SelectItem value="CLIENT">CLIENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="epassword">Nova Senha (opcional)</Label>
                  <Input
                    id="epassword"
                    type="password"
                    value={formEdit.password}
                    onChange={(e) =>
                      setFormEdit((s) => ({ ...s, password: e.target.value }))
                    }
                    placeholder="Deixe em branco para manter"
                    className="focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenEditId(null)}>
                Cancelar
              </Button>
              <Button onClick={onEdit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
