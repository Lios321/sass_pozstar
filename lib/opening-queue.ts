import { getDb } from "@/lib/db/drizzle"
import { openingQueueItems } from "@/lib/db/schema"
import { eq, asc, and, lt, count } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
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
  status: string
}

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
  const db = getDb();
  const id = uuidv4();
  const arrivalDate = input.arrivalDate || new Date();
  
  const newItem = await db.insert(openingQueueItems).values({
    id,
    clientId: input.clientId || null,
    clientName: input.clientName,
    contactPhone: input.contactPhone,
    equipmentType: input.equipmentType,
    equipmentDesc: input.equipmentDesc || null,
    arrivalDate,
    notes: input.notes || null,
    status: "PENDING",
    positionIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  const created = newItem[0];

  // Recalcular posições
  await recalcPositions()
  // Enviar mensagem inicial
  const countAhead = await countAheadFor(created.id)
  await sendPendingNotification(created as unknown as QueueItem, countAhead)
  return created
}

export async function listQueue() {
  const db = getDb();
  const all = await db.query.openingQueueItems.findMany({
    orderBy: [asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt)],
  });
  return computePositions(all as unknown as QueueItem[])
}

export async function openItem(id: string) {
  const db = getDb();
  
  // Capturar estado antes da abertura para comparar posições
  const before = await db.query.openingQueueItems.findMany({
    where: eq(openingQueueItems.status, "PENDING"),
    orderBy: [asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt)],
  });

  const beforeIndex = new Map<string, number>()
  {
    let idx = 0
    for (const it of before) {
      beforeIndex.set(it.id, idx)
      idx++
    }
  }

  const updatedItems = await db.update(openingQueueItems)
    .set({ status: "OPENED" })
    .where(eq(openingQueueItems.id, id))
    .returning();
    
  const item = updatedItems[0];

  await recalcPositions()
  
  // Notificar o cliente do próprio equipamento aberto
  try {
    await sendOpenedNotification(item as unknown as QueueItem)
  } catch {}
  
  // Após abertura, enviar atualização APENAS para quem teve melhora na posição
  const after = await db.query.openingQueueItems.findMany({
    where: eq(openingQueueItems.status, "PENDING"),
    orderBy: [asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt)],
  })
  
  let idx = 0
  for (const p of after) {
    const beforePos = beforeIndex.get(p.id)
    const afterPos = idx
    idx++
    if (beforePos === undefined) continue
    if (afterPos < beforePos) {
      const countAhead = afterPos
      await sendPendingNotification(p as unknown as QueueItem, countAhead)
    }
  }
  return item
}

export async function recalcPositions() {
  const db = getDb();
  const items = await db.query.openingQueueItems.findMany({
    orderBy: [asc(openingQueueItems.arrivalDate), asc(openingQueueItems.createdAt)],
  })
  
  let idx = 0
  for (const item of items) {
    if (item.status !== "PENDING") continue
    await db.update(openingQueueItems)
      .set({ positionIndex: idx })
      .where(eq(openingQueueItems.id, item.id));
    idx++
  }
}

export async function countAheadFor(id: string): Promise<number> {
  const db = getDb();
  const current = await db.query.openingQueueItems.findFirst({
    where: eq(openingQueueItems.id, id)
  });
  
  if (!current) return 0
  
  const result = await db.select({ count: count() })
    .from(openingQueueItems)
    .where(
      and(
        eq(openingQueueItems.status, "PENDING"),
        lt(openingQueueItems.arrivalDate, current.arrivalDate)
      )
    );
    
  return result[0].count;
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
