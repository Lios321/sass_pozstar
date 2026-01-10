import { prisma } from "@/lib/prisma"
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
  arrivalDate: Date
  positionIndex: number
  status: "PENDING" | "OPENED"
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
  const data = {
    clientId: input.clientId || null,
    clientName: input.clientName,
    contactPhone: input.contactPhone,
    equipmentType: input.equipmentType,
    equipmentDesc: input.equipmentDesc || null,
    arrivalDate: input.arrivalDate || new Date(),
    notes: input.notes || null,
    status: "PENDING" as const,
  }
  const created = await prisma.openingQueueItem.create({ data })
  // Recalcular posições
  await recalcPositions()
  // Enviar mensagem inicial
  const countAhead = await countAheadFor(created.id)
  await sendPendingNotification(created, countAhead)
  return created
}

export async function listQueue() {
  const all = await prisma.openingQueueItem.findMany({
    orderBy: [{ arrivalDate: "asc" }, { createdAt: "asc" }],
  })
  return computePositions(all as unknown as QueueItem[])
}

export async function openItem(id: string) {
  // Capturar estado antes da abertura para comparar posições
  const before = await prisma.openingQueueItem.findMany({
    where: { status: "PENDING" },
    orderBy: [{ arrivalDate: "asc" }, { createdAt: "asc" }],
  })
  const beforeIndex = new Map<string, number>()
  {
    let idx = 0
    for (const it of before) {
      beforeIndex.set(it.id, idx)
      idx++
    }
  }
  const item = await prisma.openingQueueItem.update({
    where: { id },
    data: { status: "OPENED" },
  })
  await recalcPositions()
  // Notificar o cliente do próprio equipamento aberto
  try {
    await sendOpenedNotification(item as any)
  } catch {}
  // Após abertura, enviar atualização APENAS para quem teve melhora na posição
  const after = await prisma.openingQueueItem.findMany({
    where: { status: "PENDING" },
    orderBy: [{ arrivalDate: "asc" }, { createdAt: "asc" }],
  })
  let idx = 0
  for (const p of after) {
    const beforePos = beforeIndex.get(p.id)
    const afterPos = idx
    idx++
    if (beforePos === undefined) continue
    if (afterPos < beforePos) {
      const countAhead = afterPos
      await sendPendingNotification(p as any, countAhead)
    }
  }
  return item
}

export async function recalcPositions() {
  const items = await prisma.openingQueueItem.findMany({
    orderBy: [{ arrivalDate: "asc" }, { createdAt: "asc" }],
  })
  let idx = 0
  for (const item of items) {
    if (item.status !== "PENDING") continue
    await prisma.openingQueueItem.update({
      where: { id: item.id },
      data: { positionIndex: idx },
    })
    idx++
  }
}

export async function countAheadFor(id: string): Promise<number> {
  const current = await prisma.openingQueueItem.findUnique({ where: { id } })
  if (!current) return 0
  const count = await prisma.openingQueueItem.count({
    where: {
      status: "PENDING",
      arrivalDate: { lt: current.arrivalDate },
    },
  })
  return count
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
