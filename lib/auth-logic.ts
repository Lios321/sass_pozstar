import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '@/lib/auth-core'

export async function authorizeUser(credentials: any, db: any) {
  try {
    if (!credentials?.email || !credentials?.password) {
      return null
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, credentials.email)
    })

    console.log('Auth authorize attempt', {
      email: credentials.email,
      found: !!user,
    })

    if (!user) {
      return null
    }

    const isPasswordValid = await verifyPassword(
      credentials.password,
      user.password
    )

    console.log('Password validation', {
      email: credentials.email,
      ok: isPasswordValid,
    })

    if (!isPasswordValid) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  } catch (error) {
    console.error('Erro na autorização:', error)
    return null
  }
}
