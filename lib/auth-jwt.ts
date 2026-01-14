import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET as string

export type UserTokenPayload = {
  id?: string
  role?: string
  [key: string]: unknown
} | null

export function verifyToken(token: string): UserTokenPayload {
  if (!JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (typeof decoded === 'string') {
      return { token: decoded } as UserTokenPayload
    }
    return decoded as UserTokenPayload
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Também verifica cookies
  const token = request.cookies.get('token')?.value
  return token || null
}

export function getUserFromToken(token: string | null): UserTokenPayload {
  if (!token) return null
  return verifyToken(token)
}
