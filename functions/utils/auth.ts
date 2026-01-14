import { getToken } from 'next-auth/jwt';

export async function getSessionUser(request: Request, env: any) {
  const secret = env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn('NEXTAUTH_SECRET not found in env');
  }
  // getToken expects a Next.js Request or compatible. 
  // Cloudflare Request is standard Request.
  // We might need to handle cookies manually if getToken doesn't find them automatically in standard Request
  // But next-auth v4 getToken supports standard Request.
  const token = await getToken({ req: request as any, secret });
  return token;
}

export function isAuthorized(token: any, requiredRole?: string) {
  if (!token) return false;
  if (requiredRole && token.role !== requiredRole) return false;
  return true;
}
