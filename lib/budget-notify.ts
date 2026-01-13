import { ReceiptService } from "./receipt-service";
import { uploadMedia, sendTemplate } from "./whatsapp";
import { buildTemplatePayload } from "./whatsapp-templates";

function brMoney(value: number): string {
  const v = Number(value || 0);
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);
  } catch {
    return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

export async function sendBudgetWhatsApp(serviceOrderId: string) {
  // DESABILITADO TEMPORARIAMENTE
  return { ok: false, error: "whatsapp_disabled" };
}
