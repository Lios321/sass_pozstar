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
    if (!this.API_BASE_URL || !this.API_TOKEN) {
      console.error('❌ Configurações do WhatsApp API não encontradas');
      return false;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const response = await fetch(`${this.API_BASE_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      if (response.ok) {
        console.log('✅ Mensagem WhatsApp enviada com sucesso');
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Erro ao enviar mensagem WhatsApp:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro na requisição WhatsApp:', error);
      return false;
    }
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
    if (!this.API_BASE_URL || !this.API_TOKEN) {
      console.error('❌ Configurações do WhatsApp API não encontradas');
      return false;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const base64Document = documentBuffer.toString('base64');
      
      const response = await fetch(`${this.API_BASE_URL}/send-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_TOKEN}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
          document: {
            filename: filename,
            base64: base64Document,
          },
        }),
      });

      if (response.ok) {
        console.log('✅ Documento WhatsApp enviado com sucesso');
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Erro ao enviar documento WhatsApp:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro na requisição WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia o comprovante de recebimento via WhatsApp
   */
  static async sendReceiptWhatsApp(data: ReceiptWhatsAppData): Promise<boolean> {
    const message = this.generateReceiptMessage(data);

    // Primeiro tenta enviar com o documento anexado
    const documentSent = await this.sendDocument(
      data.clientPhone,
      message,
      data.pdfBuffer,
      data.pdfFileName
    );

    if (documentSent) {
      return true;
    }

    // Se falhar, envia apenas a mensagem de texto
    console.log('⚠️ Falha ao enviar documento, enviando apenas mensagem de texto');
    return await this.sendTextMessage(data.clientPhone, message);
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
    const internalPhone = process.env.INTERNAL_WHATSAPP_PHONE;
    if (!internalPhone) {
      console.log('⚠️ WhatsApp interno não configurado, pulando notificação');
      return true;
    }

    const message = `🔔 *Nova OS Criada*

📋 *OS:* ${data.orderNumber}
👤 *Cliente:* ${data.clientName}
📱 *Telefone:* ${data.clientPhone}
🔧 *Equipamento:* ${data.equipmentType}
📅 *Data:* ${new Date().toLocaleString('pt-BR')}

✅ Comprovante enviado automaticamente ao cliente.`;

    return await this.sendTextMessage(internalPhone, message);
  }

  /**
   * Verifica se o serviço WhatsApp está configurado
   */
  static isConfigured(): boolean {
    return !!(this.API_BASE_URL && this.API_TOKEN);
  }
}