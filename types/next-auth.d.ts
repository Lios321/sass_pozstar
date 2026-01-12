import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "USER" | "TECHNICIAN" | "CLIENT"
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    role: "ADMIN" | "USER" | "TECHNICIAN" | "CLIENT"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "ADMIN" | "USER" | "TECHNICIAN" | "CLIENT"
  }
}
