interface WhatsAppMessage {
  phone: string;
  message: string;
  document?: {
    filename: string;
    base64: string;
  };
}

interface ReceiptWhatsAppData {
  clientName: string;
  clientPhone: string;
  orderNumber: string;
  equipmentType: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
}

export class WhatsAppService {
  private static readonly API_BASE_URL = process.env.WHATSAPP_API_URL || '';
  private static readonly API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

  /**
   * Formata o número de telefone para o padrão internacional
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se não começar com 55 (código do Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  /**
   * Envia uma mensagem de texto via WhatsApp
   */
  static async sendTextMessage(phone: string, message: string): Promise<boolean> {
    // DESABILITADO TEMPORARIAMENTE
    return false;
  }

  /**
   * Envia um documento via WhatsApp
   */
  static async sendDocument(
    phone: string,
    message: string,
    documentBuffer: Buffer,
    filename: string
  ): Promise<boolean> {
    // DESABILITADO TEMPORARIAMENTE
    return false;
  }

  /**
   * Envia o comprovante de recebimento via WhatsApp
   */
  static async sendReceiptWhatsApp(data: ReceiptWhatsAppData): Promise<boolean> {
    // DESABILITADO TEMPORARIAMENTE
    return false;
  }

  /**
   * Gera a mensagem de texto para o comprovante
   */
  private static generateReceiptMessage(data: ReceiptWhatsAppData): string {
    return `🔧 *POZSTAR - Comprovante de Recebimento*

Olá, *${data.clientName}*!

✅ Confirmamos o recebimento do seu equipamento para avaliação técnica.

📋 *Detalhes da OS:*
• Número: *${data.orderNumber}*
• Equipamento: *${data.equipmentType}*
• Data: *${new Date().toLocaleDateString('pt-BR')}*

📎 O comprovante oficial está anexado a esta mensagem.

📞 *Próximos passos:*
• Nossa equipe iniciará a avaliação
• Você será contactado com o diagnóstico
• Mantenha este comprovante para referência

Obrigado por confiar na Pozstar! 🚀

_Esta é uma mensagem automática._`;
  }

  /**
   * Envia notificação de nova OS para equipe interna via WhatsApp
   */
  static async sendInternalNotification(data: ReceiptWhatsAppData): Promise<boolean> {
    // DESABILITADO TEMPORARIAMENTE
    return false;
  }

  /**
   * Verifica se o serviço WhatsApp está configurado
   */
  static isConfigured(): boolean {
    return !!(this.API_BASE_URL && this.API_TOKEN);
  }
}
