import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { unauthorized } from '../utils/errors'

/**
 * Garante que a requisição esteja autenticada e retorna a sessão do usuário
 * @param request Objeto da requisição
 * @returns Sessão NextAuth com user.id e role
 * @throws unauthorized caso não autenticado
 */
export async function requireAuth(request: Request): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user as any)?.id) {
    throw unauthorized('Sessão ausente ou inválida')
  }
  return session
}
