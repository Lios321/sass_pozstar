import { getRequestContext } from "@cloudflare/next-on-pages"
import { sendTemplate } from "@/lib/whatsapp"
import { buildTemplatePayload } from "@/lib/whatsapp-templates"

export type QueueItemInput = {
  clientId?: string
  clientName: string
  contactPhone: string
  equipmentType: string
  equipmentDesc?: string
  arrivalDate?: Date
  notes?: string
}

export type QueueItem = {
  id: string
  clientId?: string | null
  clientName: string
  contactPhone: string
  equipmentType: string
  equipmentDesc?: string | null
  arrivalDate: string // D1 returns dates as strings usually
  positionIndex: number
  status: "PENDING" | "OPENED"
  createdAt: string
  updatedAt: string
}

// Helper to get DB
const getDB = () => getRequestContext().env.DB

export function computePositions(items: Array<QueueItem>): Array<QueueItem> {
  const pending = items
    .filter((i) => i.status === "PENDING")
    .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
  const idToIndex = new Map<string, number>()
  pending.forEach((item, idx) => idToIndex.set(item.id, idx))
  return items.map((i) => ({
    ...i,
    positionIndex: i.status === "PENDING" ? (idToIndex.get(i.id) ?? 0) : i.positionIndex,
  }))
}

export async function enqueueItem(input: QueueItemInput) {
  const db = getDB()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const arrivalDate = input.arrivalDate ? input.arrivalDate.toISOString() : now
  
  const data = {
    id,
    clientId: input.clientId || null,
    clientName: input.clientName,
    contactPhone: input.contactPhone,
    equipmentType: input.equipmentType,
    equipmentDesc: input.equipmentDesc || null,
    arrivalDate,
    notes: input.notes || null,
    status: "PENDING" as const,
    positionIndex: 0, // Will be recalculated
    createdAt: now,
    updatedAt: now
  }

  await db.prepare(`
    INSERT INTO opening_queue_items (
      id, clientId, clientName, contactPhone, equipmentType, equipmentDesc, 
      arrivalDate, notes, status, positionIndex, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.id, data.clientId, data.clientName, data.contactPhone, data.equipmentType, data.equipmentDesc,
    data.arrivalDate, data.notes, data.status, data.positionIndex, data.createdAt, data.updatedAt
  ).run()

  const created = data

  // Recalcular posições
  await recalcPositions()
  // Enviar mensagem inicial
  const countAhead = await countAheadFor(created.id)
  await sendPendingNotification(created as any, countAhead)
  return created
}

export async function listQueue() {
  const db = getDB()
  const { results } = await db.prepare(`
    SELECT * FROM opening_queue_items 
    ORDER BY arrivalDate ASC, createdAt ASC
  `).all<QueueItem>()
  
  return computePositions(results)
}

export async function openItem(id: string) {
  const db = getDB()
  
  // Capturar estado antes da abertura para comparar posições
  const { results: before } = await db.prepare(`
    SELECT id FROM opening_queue_items 
    WHERE status = 'PENDING' 
    ORDER BY arrivalDate ASC, createdAt ASC
  `).all<{ id: string }>()

  const beforeIndex = new Map<string, number>()
  before.forEach((item, idx) => beforeIndex.set(item.id, idx))

  // Update status
  const now = new Date().toISOString()
  await db.prepare(`
    UPDATE opening_queue_items 
    SET status = 'OPENED', updatedAt = ? 
    WHERE id = ?
  `).bind(now, id).run()

  // Fetch updated item
  const item = await db.prepare('SELECT * FROM opening_queue_items WHERE id = ?').bind(id).first<QueueItem>()
  
  if (!item) throw new Error("Item not found")

  await recalcPositions()
  
  // Notificar o cliente do próprio equipamento aberto
  try {
    await sendOpenedNotification(item)
  } catch {}
  
  // Após abertura, enviar atualização APENAS para quem teve melhora na posição
  const { results: after } = await db.prepare(`
    SELECT * FROM opening_queue_items 
    WHERE status = 'PENDING' 
    ORDER BY arrivalDate ASC, createdAt ASC
  `).all<QueueItem>()

  let idx = 0
  for (const p of after) {
    const beforePos = beforeIndex.get(p.id)
    const afterPos = idx
    idx++
    if (beforePos === undefined) continue
    if (afterPos < beforePos) {
      const countAhead = afterPos
      await sendPendingNotification(p, countAhead)
    }
  }
  return item
}

export async function recalcPositions() {
  const db = getDB()
  const { results: items } = await db.prepare(`
    SELECT id, status FROM opening_queue_items 
    ORDER BY arrivalDate ASC, createdAt ASC
  `).all<{ id: string, status: string }>()

  let idx = 0
  for (const item of items) {
    if (item.status !== "PENDING") continue
    // Update one by one - D1 supports batching but loop is simpler for migration
    // For better performance in future we can use batch()
    await db.prepare('UPDATE opening_queue_items SET positionIndex = ? WHERE id = ?')
      .bind(idx, item.id)
      .run()
    idx++
  }
}

export async function countAheadFor(id: string): Promise<number> {
  const db = getDB()
  const current = await db.prepare('SELECT arrivalDate FROM opening_queue_items WHERE id = ?').bind(id).first<{ arrivalDate: string }>()
  
  if (!current) return 0
  
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM opening_queue_items 
    WHERE status = 'PENDING' AND arrivalDate < ?
  `).bind(current.arrivalDate).first<{ count: number }>()
  
  return result?.count || 0
}

async function sendPendingNotification(item: QueueItem, countAhead: number) {
  if (!item.contactPhone) return
  const payload = buildTemplatePayload("equipamentos_pendentes_abertura", {
    nome: item.clientName,
    equipamento: item.equipmentType,
    quantidade: String(countAhead),
  })
  if (!payload) return
  const result = await sendTemplate({
    to: item.contactPhone,
    name: payload.name,
    language: payload.language,
    components: payload.components,
  })
  // DESABILITADO TEMPORARIAMENTE: não registrar notificações de erro de WhatsApp
}

async function sendOpenedNotification(item: QueueItem) {
  if (!item.contactPhone) return
  const equipamento = [item.equipmentType, item.equipmentDesc || ""].filter(Boolean).join(" ")
  const payload = buildTemplatePayload("aberto_os", {
    nome: item.clientName,
    equipamento,
  })
  if (!payload) return
  const result = await sendTemplate({
    to: item.contactPhone,
    name: payload.name,
    language: payload.language,
    components: payload.components,
  })
  // DESABILITADO TEMPORARIAMENTE: não registrar notificações de erro de WhatsApp
}
