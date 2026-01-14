import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getDb } from '@/lib/db/drizzle'
import { authorizeUser } from '@/lib/auth-logic'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        return authorizeUser(credentials, getDb())
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
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: (process.env.NEXTAUTH_URL || '').startsWith('https') ? 'none' : 'lax',
        path: '/',
        secure: (process.env.NEXTAUTH_URL || '').startsWith('https'),
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
    }
  }
}
