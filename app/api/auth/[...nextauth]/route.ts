import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

const useSecureCookies = (process.env.NEXTAUTH_URL || '').startsWith('https')
const cookiePrefix = useSecureCookies ? '__Secure-' : ''

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
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
    })
  ],
  session: { 
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 1 dia
  },
  jwt: {
    maxAge: 24 * 60 * 60 // 1 dia
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      }
    }
  },
  pages: { 
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).role = token.role as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      try {
        const base = new URL(baseUrl)
        const next = new URL(url, baseUrl)
        if (next.origin === base.origin) return next.href
        return `${baseUrl}/dashboard`
      } catch {
        return `${baseUrl}/dashboard`
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
