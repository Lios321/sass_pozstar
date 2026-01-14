// import nodemailer from 'nodemailer'; // Disabled for Edge compatibility
import { logger } from './logger';
import { captureException } from './monitoring';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface ReceiptEmailData {
  clientName: string;
  clientEmail: string;
  orderNumber: string;
  equipmentType: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
}

export class EmailService {
  // private static transporter: nodemailer.Transporter | null = null;
  private static transporter: any | null = null;
  private static isEthereal = false;
  private static isSimulated = false;

  /**
   * Inicializa o transportador de email
   */
  // private static async getTransporter(): Promise<nodemailer.Transporter> {
  private static async getTransporter(): Promise<any> {
    // Disabled for Edge
    throw new Error('Email service not available in Edge runtime');
  }

  static getStatus() {
    return { 
        mode: 'disabled-edge', 
        host: null, 
        port: null, 
        secure: false, 
        fromConfigured: false, 
        fromAddress: null 
    };
  }

  /**
   * Envia um email genérico
   */
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
      logger.warn('Email sending disabled in Edge runtime');
      return { success: false, error: 'Email service disabled in Edge runtime' };
  }

  /**
   * Envia o comprovante de recebimento por email
   */
  static async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
      logger.warn('Receipt email sending disabled in Edge runtime');
      return false;
  }

  /**
   * Gera o template HTML para o email do comprovante
   */
  private static generateReceiptEmailTemplate(data: ReceiptEmailData): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Comprovante de Recebimento</title>
    </head>
    <body>
        <p>Comprovante para ${data.clientName} (OS ${data.orderNumber})</p>
    </body>
    </html>
    `;
  }

  /**
   * Envia cópia do comprovante para email interno da empresa
   */
  static async sendInternalCopy(data: ReceiptEmailData): Promise<boolean> {
      return false;
  }
}
