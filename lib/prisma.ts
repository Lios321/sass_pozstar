import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Em produção, exigir DATABASE_URL explícito; em dev, usar caminho ABSOLUTO do SQLite
const isProduction = process.env.NODE_ENV === 'production'
let datasourceUrl: string | undefined
if (isProduction) {
  datasourceUrl = process.env.DATABASE_URL
} else {
  const dbAbsPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')
  datasourceUrl = `file:${dbAbsPath}`
}

if (isProduction && !datasourceUrl) {
  throw new Error('DATABASE_URL não configurada em produção')
}

const prismaClient = new PrismaClient({
  datasources: {
    db: {
      url: datasourceUrl,
    },
  },
})

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
