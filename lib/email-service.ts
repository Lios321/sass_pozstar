import nodemailer from 'nodemailer';

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
  to: string;
  subject: string;
  html: string;
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

  /**
   * Inicializa o transportador de email
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // Validar configurações obrigatórias
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ Configurações de email não encontradas. Verifique SMTP_USER e SMTP_PASS no .env');
      throw new Error('Configurações de email não encontradas');
    }

    console.log('📧 Inicializando serviço de email...');
    console.log(`📧 Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`📧 Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`📧 User: ${process.env.SMTP_USER}`);

    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);

    // Verifica a conexão
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email conectado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao conectar com servidor de email:', error);
      throw new Error('Falha na configuração do servidor de email');
    }

    return this.transporter;
  }

  /**
   * Envia um email genérico
   */
  static async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      console.log(`📧 Tentando enviar email para: ${emailData.to}`);
      console.log(`📧 Assunto: ${emailData.subject}`);
      
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `"Pozstar" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado com sucesso:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Envia o comprovante de recebimento por email
   */
  static async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    const emailHtml = this.generateReceiptEmailTemplate(data);

    const emailData: EmailData = {
      to: data.clientEmail,
      subject: `Comprovante de Recebimento - OS ${data.orderNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: data.pdfFileName,
          content: data.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    return await this.sendEmail(emailData);
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
    const internalEmail = process.env.INTERNAL_EMAIL;
    if (!internalEmail) {
      console.log('⚠️ Email interno não configurado, pulando envio da cópia');
      return true;
    }

    const emailData: EmailData = {
      to: internalEmail,
      subject: `[CÓPIA] Comprovante Enviado - OS ${data.orderNumber}`,
      html: `
        <h3>Cópia do Comprovante Enviado</h3>
        <p><strong>Cliente:</strong> ${data.clientName}</p>
        <p><strong>Email:</strong> ${data.clientEmail}</p>
        <p><strong>OS:</strong> ${data.orderNumber}</p>
        <p><strong>Equipamento:</strong> ${data.equipmentType}</p>
        <p><strong>Enviado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      `,
      attachments: [
        {
          filename: data.pdfFileName,
          content: data.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    return await this.sendEmail(emailData);
  }
}