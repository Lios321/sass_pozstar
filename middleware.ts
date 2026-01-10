export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    // Proteger o dashboard e subrotas
    '/dashboard/:path*',
    // Exemplo de rota admin caso exista
    '/admin/:path*'
  ],
}