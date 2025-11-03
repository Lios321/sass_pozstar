/*
  One-off script to normalize invalid enum values in service_orders.status
  Maps legacy values (e.g., 'IN_PROGRESS') to current Prisma enum values.
*/
const { PrismaClient } = require('@prisma/client')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')
const url = `file:${dbPath}`
const prisma = new PrismaClient({ datasources: { db: { url } } })

// Current valid enum values in schema.prisma
const VALID = new Set([
  'SEM_VER',
  'ORCAMENTAR',
  'APROVADO',
  'ESPERANDO_PECAS',
  'COMPRADO',
  'MELHORAR',
  'TERMINADO',
  'SEM_PROBLEMA',
  'SEM_CONSERTO',
  'DEVOLVIDO',
  'DESCARTE',
  'VENDIDO',
  'ESPERANDO_CLIENTE',
])

// Legacy -> Current mapping
const LEGACY_TO_CURRENT = {
  NEW: 'SEM_VER',
  PENDING: 'SEM_VER',
  IN_ANALYSIS: 'ORCAMENTAR',
  APPROVED: 'APROVADO',
  IN_PROGRESS: 'MELHORAR',
  WAITING_PARTS: 'ESPERANDO_PECAS',
  TESTING: 'MELHORAR',
  COMPLETED: 'TERMINADO',
  DELIVERED: 'DEVOLVIDO',
  CANCELLED: 'SEM_CONSERTO',
}

async function main() {
  console.log('🔎 Verificando statuses distintos em service_orders...')
  console.log('Using SQLite URL:', url)
  const rows = await prisma.$queryRaw`SELECT DISTINCT status as status FROM service_orders`
  const statuses = rows.map(r => String(r.status))
  console.log('Encontrados:', statuses)

  const invalids = statuses.filter(s => !VALID.has(s))
  if (invalids.length === 0) {
    console.log('✅ Nenhum status inválido encontrado. Nada a corrigir.')
  } else {
    console.log('⚠️ Status inválidos:', invalids)

    for (const invalid of invalids) {
      const mapped = LEGACY_TO_CURRENT[invalid]
      if (!mapped) {
        console.warn(`↪️  Status legado sem mapeamento explícito: '${invalid}'. Definindo para 'SEM_VER'.`)
      }
      const target = mapped || 'SEM_VER'
      const res = await prisma.$executeRaw`UPDATE service_orders SET status = ${target} WHERE status = ${invalid}`
      console.log(`➡️  Atualizados registros com status '${invalid}' para '${target}' (alterados: ${res})`)
    }
  }

  const after = await prisma.$queryRaw`SELECT DISTINCT status as status FROM service_orders ORDER BY status`
  console.log('📋 Status após correção:', after.map(r => String(r.status)))
}

main()
  .catch((e) => {
    console.error('❌ Erro na correção de statuses:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })