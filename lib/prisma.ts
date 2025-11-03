import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Em produção, exigir DATABASE_URL explícito; em dev, fazer fallback ao SQLite local
const isProduction = process.env.NODE_ENV === 'production'
const datasourceUrl = process.env.DATABASE_URL || (!isProduction ? 'file:./prisma/dev.db' : undefined)

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