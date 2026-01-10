"use server"

const API_BASE = "https://graph.facebook.com/v20.0";

function formatE164(input: string): string {
  const digits = String(input).replace(/[^\d]/g, "");
  if (digits.startsWith("55")) return digits;
  // Se vier com DDD e número sem país, prefixa 55
  return `55${digits}`;
}

export async function sendTemplate(opts: {
  to: string;
  name: string;
  language?: string;
  components: Array<any>;
}) {
  // DESABILITADO TEMPORARIAMENTE: envio de mensagens WhatsApp
  return { ok: false, error: "whatsapp_disabled" };
}

export async function uploadMedia(input: { buffer: Buffer; filename: string; mimeType: string }) {
  // DESABILITADO TEMPORARIAMENTE: upload de mídia para WhatsApp
  return { ok: false, error: "whatsapp_disabled" };
}
