"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import UsersClient from './UsersClient'

export default function UsersPage() {
  const { status, data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.replace('/login')
      return
    }

    if ((session.user as any)?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <div className="p-4">Carregando...</div>
  }

  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <UsersClient />
    </div>
  )
}
