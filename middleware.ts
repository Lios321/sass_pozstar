import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl
      console.log("Middleware checking:", pathname);

      // Allow access to login page explicitly to prevent redirect loops
      if (
        pathname.startsWith("/login") || 
        pathname.startsWith("/api/auth") || 
        pathname.startsWith("/_next") || 
        pathname === "/favicon.ico"
      ) {
        console.log("Allowing access to public page");
        return true
      }
      
      console.log("Token exists:", !!token);
      return !!token
    },
  },
})

export const config = {
  matcher: [
    // Proteger o dashboard e subrotas
    "/dashboard/:path*",
    // Exemplo de rota admin caso exista
    "/admin/:path*"
  ],
}