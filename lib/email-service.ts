import nodemailer from 'nodemailer';
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
  private static transporter: nodemailer.Transporter | null = null;
  private static isEthereal = false;
  private static isSimulated = false;

  /**
   * Inicializa o transportador de email
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const hasCreds = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

    logger.info('Inicializando serviço de email');

    let config: EmailConfig | undefined;
    if (hasCreds) {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.SMTP_PORT || '587');
      const secure = process.env.SMTP_SECURE === 'true';
      const auth = {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      };
      const transportOpts: any = { host, port, secure, auth };
      if (host.includes('zoho')) {
        transportOpts.authMethod = 'LOGIN';
      }
      this.transporter = nodemailer.createTransport(transportOpts);
    } else {
      if (process.env.NODE_ENV === 'production') {
        logger.error('Configurações de email ausentes: SMTP_USER/SMTP_PASS');
        throw new Error('Configurações de email não encontradas');
      }
      try {
        const testAccount = await nodemailer.createTestAccount();
        config = {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        };
        this.isEthereal = true;
        logger.info('Usando conta de teste Ethereal para envio de email em desenvolvimento');
      } catch (e) {
        logger.warn('Falha ao criar conta Ethereal, usando transporte JSON local', e);
        this.transporter = nodemailer.createTransport({ jsonTransport: true } as any);
        this.isSimulated = true;
        logger.info('Transporte de email simulado (JSON) inicializado');
        return this.transporter;
      }
    }

    if (!this.transporter && config) {
      this.transporter = nodemailer.createTransport(config as any);
    }

    try {
      await this.transporter!.verify();
      logger.info('Servidor de email conectado');
    } catch (error) {
      logger.error('Erro ao conectar com servidor de email', error);
      captureException(error, { scope: 'email.verify' });
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha na configuração do servidor de email: ${msg}`);
    }

    return this.transporter as nodemailer.Transporter;
  }

  static getStatus() {
    const hasCreds = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
    const mode = this.isSimulated ? 'simulado-json' : this.isEthereal ? 'ethereal' : hasCreds ? 'real' : 'desconhecido';
    const opts = this.transporter && typeof (this.transporter as any).options === 'object'
      ? (this.transporter as any).options
      : null;
    const host = (opts && opts.host) || process.env.SMTP_HOST || null;
    const port = (opts && opts.port) || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : null);
    const secure = (opts && typeof opts.secure === 'boolean') ? opts.secure : (process.env.SMTP_SECURE === 'true');
    const fromConfigured = !!(process.env.SMTP_FROM || process.env.SMTP_USER);
    const fromAddress = (process.env.SMTP_FROM || process.env.SMTP_USER) || null;
    return { mode, host, port, secure, fromConfigured, fromAddress };
  }

  /**
   * Envia um email genérico
   */
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
    try {
      const transporter = await this.getTransporter();
      const from =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        'Pozstar <no-reply@pozstar.local>';
      const info = await transporter.sendMail({
        from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments,
      } as any);
      let previewUrl: string | undefined;
      if (this.isEthereal && (info as any)) {
        try {
          // @ts-ignore - função util do nodemailer
          const url = (await import('nodemailer')).default.getTestMessageUrl(info);
          if (url) previewUrl = String(url);
        } catch {}
      }
      logger.info('Email enviado', { messageId: info.messageId, previewUrl });
      return { success: true, previewUrl };
    } catch (error) {
      logger.error('Falha ao enviar email', error as any);
      captureException(error, { scope: 'email.send' });
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  }

  /**
   * Envia o comprovante de recebimento por email
   */
  static async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      const from =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        'Pozstar <no-reply@pozstar.local>';
      const html = this.generateReceiptEmailTemplate(data);
      const info = await transporter.sendMail({
        from,
        to: data.clientEmail,
        subject: `Comprovante de Recebimento — OS ${data.orderNumber}`,
        html,
        attachments: [
          {
            filename: data.pdfFileName,
            content: data.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      } as any);
      logger.info('Comprovante enviado', { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('Falha ao enviar comprovante', error as any);
      captureException(error, { scope: 'email.receipt' });
      return false;
    }
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprovante de Recebimento</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                width: 60px;
                height: 60px;
                background: #3b82f6;
                border-radius: 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #1f2937;
                margin: 10px 0 5px 0;
            }
            .tagline {
                color: #6b7280;
                font-size: 14px;
            }
            .title {
                font-size: 24px;
                font-weight: bold;
                color: #1f2937;
                text-align: center;
                margin: 30px 0;
            }
            .info-section {
                margin: 25px 0;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
            }
            .info-title {
                font-size: 16px;
                font-weight: bold;
                color: #3b82f6;
                margin-bottom: 10px;
            }
            .info-item {
                margin: 8px 0;
                color: #4b5563;
            }
            .highlight {
                font-weight: bold;
                color: #1f2937;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }
            .attachment-notice {
                background: #dbeafe;
                border: 1px solid #93c5fd;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
            }
            .attachment-icon {
                font-size: 24px;
                margin-bottom: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">P</div>
                <div class="company-name">Pozstar</div>
                <div class="tagline">Assistência Técnica Especializada</div>
            </div>

            <div class="title">Comprovante de Recebimento</div>

            <p>Olá, <strong>${data.clientName}</strong>!</p>
            
            <p>Confirmamos o recebimento do seu equipamento para avaliação técnica. Segue em anexo o comprovante oficial de recebimento.</p>

            <div class="info-section">
                <div class="info-title">📋 Detalhes da Ordem de Serviço</div>
                <div class="info-item">
                    <span class="highlight">Número da OS:</span> ${data.orderNumber}
                </div>
                <div class="info-item">
                    <span class="highlight">Equipamento:</span> ${data.equipmentType}
                </div>
                <div class="info-item">
                    <span class="highlight">Data de Recebimento:</span> ${new Date().toLocaleDateString('pt-BR')}
                </div>
            </div>

            <div class="attachment-notice">
                <div class="attachment-icon">📎</div>
                <strong>Comprovante em Anexo</strong><br>
                O comprovante oficial está anexado a este email em formato PDF.
            </div>

            <div class="info-section">
                <div class="info-title">📞 Próximos Passos</div>
                <div class="info-item">
                    • Nossa equipe técnica iniciará a avaliação do seu equipamento
                </div>
                <div class="info-item">
                    • Você será contactado assim que tivermos um diagnóstico
                </div>
                <div class="info-item">
                    • Mantenha este comprovante para referência futura
                </div>
            </div>

            <p>Se tiver alguma dúvida, entre em contato conosco.</p>

            <div class="footer">
                <p><strong>Pozstar - Assistência Técnica Especializada</strong></p>
                <p>Este é um email automático. Por favor, não responda diretamente.</p>
                <p>Comprovante gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Envia cópia do comprovante para email interno da empresa
   */
  static async sendInternalCopy(data: ReceiptEmailData): Promise<boolean> {
    try {
      const internal = process.env.INTERNAL_EMAIL || process.env.SMTP_USER;
      if (!internal) {
        logger.warn('Email interno não configurado');
        return false;
      }
      const transporter = await this.getTransporter();
      const from =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        'Pozstar <no-reply@pozstar.local>';
      const html = this.generateReceiptEmailTemplate(data);
      const info = await transporter.sendMail({
        from,
        to: internal,
        subject: `Cópia interna — Comprovante OS ${data.orderNumber}`,
        html,
        attachments: [
          {
            filename: data.pdfFileName,
            content: data.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      } as any);
      logger.info('Cópia interna enviada', { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('Falha ao enviar cópia interna', error as any);
      captureException(error, { scope: 'email.internalCopy' });
      return false;
    }
  }
}
