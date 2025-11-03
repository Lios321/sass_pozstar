import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';

interface ServiceOrderData {
  id: string;
  orderNumber: string;
  client: {
    name: string;
    phone: string;
    email?: string;
    document?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    complement?: string;
    neighborhood?: string;
  };
  equipmentType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  color?: string;
  reportedDefect: string;
  receivedAccessories?: string;
  arrivalDate: Date;
  createdAt: Date;
  createdBy?: {
    name: string;
  };
}

interface ReceiptMetadata {
  buffer: Buffer;
  filename: string;
  size: number;
  generatedAt: Date;
}

export class ReceiptGenerator {
  private static readonly COMPANY_NAME = 'Pozstar';
  private static readonly COMPANY_TAGLINE = 'Assistência Técnica Especializada';
  private static readonly RECEIPT_TITLE = 'COMPROVANTE DIGITAL / TERMO DE RECEBIMENTO DE EQUIPAMENTO';
  private static readonly TEMPLATE_VERSION = '2.0';
  private static readonly COLORS = {
    background: '#FFFFFF',
    panel: '#F7F9FC',
    primaryText: '#333333',
    secondaryText: '#555555',
    accent: '#0077FF',
    accentSoft: '#4DA3FF',
    divider: '#DDDDDD',
  } as const;
  
private static readonly RECEIPT_TERMS = `TERMO DE RECEBIMENTO DIGITAL – POZSTAR

Eu, {CLIENT_NAME}, portador(a) do documento {CLIENT_DOCUMENT}, declaro ter entregue à empresa POZSTAR ASSISTÊNCIA TÉCNICA ESPECIALIZADA o equipamento acima descrito, para fins de análise técnica e eventual reparo, conforme as condições a seguir:

1. Diagnóstico técnico
Autorizo a Pozstar a realizar diagnóstico técnico do equipamento, incluindo, se necessário, desmontagem parcial ou total para avaliação de componentes e identificação de defeitos. Reconheço que esse procedimento é essencial para determinar com precisão a causa da falha e o orçamento do serviço.

2. Aprovação de serviços
Fica estabelecido que qualquer reparo, substituição de peças ou serviço adicional somente será executado mediante minha autorização prévia e expressa, formalizada por meio digital, e-mail ou outro canal de comunicação registrado.

3. Responsabilidade sobre o equipamento
A Pozstar compromete-se a zelar pela integridade do equipamento enquanto este permanecer sob sua guarda, observando condições adequadas de armazenamento. Contudo, a empresa não se responsabiliza por:
• Danos, avarias ou defeitos preexistentes à entrega;
• Perda de dados, arquivos ou configurações de software;
• Danos decorrentes de oxidação, umidade, mau uso ou intervenções anteriores não realizadas pela Pozstar.

4. Retirada e guarda
O equipamento permanecerá disponível para retirada pelo cliente por até 90 (noventa) dias após a comunicação de conclusão do serviço ou recusa do orçamento. Findo esse prazo, a Pozstar reserva-se o direito de encaminhar o equipamento para destinação técnica adequada (reciclagem, descarte ou doação), ou aplicar taxas de armazenagem, conforme políticas internas.

5. Natureza digital e validade jurídica
Este termo é emitido e arquivado eletronicamente, possuindo validade jurídica plena com base na legislação brasileira, especialmente: Lei nº 14.063/2020 (assinaturas eletrônicas), Lei nº 13.709/2018 (LGPD) e Lei nº 8.078/1990 (CDC). A autenticidade deste documento é garantida pelo número da Ordem de Serviço e seu registro digital no sistema Pozstar, dispensando assinatura física.

6. Disposições finais
O cliente declara ter lido, compreendido e aceitado todas as condições deste termo. Este documento substitui qualquer recibo físico e possui validade exclusivamente digital.

Comprovante digital emitido automaticamente pelo sistema Pozstar — validade jurídica mediante registro eletrônico.`;

  /**
   * Gera um comprovante completo em PDF
   */
  static async generateReceipt(serviceOrder: ServiceOrderData): Promise<ReceiptMetadata> {
    return new Promise(async (resolve, reject) => {
      try {
        let doc: any;

        // Inicialização simplificada do PDFKit para evitar opções não suportadas
        doc = new PDFDocument({ autoFirstPage: false });

        // Usar fonte padrão do PDFKit (Helvetica) para manter compatibilidade
        try {
          doc.font('Helvetica');
        } catch {}

        // Página A4 com margens internas 25mm (~71pt)
        doc.addPage({
          size: 'A4',
          margins: {
            top: 71,
            bottom: 71,
            left: 71,
            right: 71
          }
        });

        // Preencher fundo branco e definir cor padrão de texto
        try {
          const pageWidth = doc.page.width;
          const pageHeight = doc.page.height;
          doc.rect(0, 0, pageWidth, pageHeight)
             .fillColor(this.COLORS.background)
             .fill();
          doc.fillColor(this.COLORS.primaryText);
        } catch {}

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const buffer = Buffer.concat(buffers);
          resolve({
            buffer,
            filename: this.generateFileName(serviceOrder.orderNumber),
            size: buffer.length,
            generatedAt: new Date()
          });
        });

        // Gerar QR Code
        const qrCodeDataURL = await QRCode.toDataURL(
          `${process.env.NEXTAUTH_URL}/dashboard/service-orders/${serviceOrder.id}`,
          { width: 100, margin: 1 }
        );

        // Construir o PDF
        await this.buildPDF(doc, serviceOrder, qrCodeDataURL);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async buildPDF(doc: any, serviceOrder: ServiceOrderData, qrCodeDataURL: string) {
    let yPosition = doc.page.margins.top;

    // Header com logo e título
    yPosition = this.addHeader(doc, yPosition);

    // Subtítulo com número da OS
    yPosition = this.addSubtitle(doc, serviceOrder.orderNumber, yPosition);

    // Dados do cliente
    yPosition = this.addClientSection(doc, serviceOrder.client, yPosition);

    // Dados do equipamento
    yPosition = this.addEquipmentSection(doc, serviceOrder, yPosition);

    // Defeito relatado
    yPosition = this.addDefectSection(doc, serviceOrder.reportedDefect, yPosition);

    // Acessórios recebidos
    yPosition = this.addAccessoriesSection(doc, serviceOrder.receivedAccessories, yPosition);

    // Datas e identificação
    yPosition = this.addDatesSection(doc, serviceOrder, yPosition);

    // Termo de recebimento
    yPosition = this.addReceiptTerms(doc, serviceOrder.client, yPosition);

    // Rodapé com QR Code
    this.addFooter(doc, qrCodeDataURL, serviceOrder.id);
  }

  private static addHeader(doc: any, yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // Logotipo Pozstar (imagem real de /public), com proporção preservada e margens internas
    const logoBox = 90; // altura/largura máxima permitida (70–90px)
    const logoMarginTop = 20; // margem superior solicitada
    const logoMarginLeft = 25; // margem esquerda solicitada
    const logoX = left + logoMarginLeft;
    const logoY = yPosition + logoMarginTop;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      // Preserva proporção: ajusta a imagem para caber dentro de 90x90 sem distorcer
      doc.image(logoBuffer, logoX, logoY, { fit: [logoBox, logoBox] });
    } catch {
      // Fallback visual caso a imagem não seja carregada
      doc.rect(logoX, logoY, logoBox, logoBox)
         .fillColor(this.COLORS.accent)
         .fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(32)
         .text('P', logoX + (logoBox / 2) - 10, logoY + (logoBox / 2) - 14);
    }

    // Nome da empresa à direita (maiúsculas) — centralizado verticalmente ao logo
    const textLeft = logoX + logoBox + 12;
    const textWidth = right - textLeft;
    const textY = logoY + (logoBox / 2) - 6; // aproximação para centralizar com fonte 10pt
    doc.fillColor(this.COLORS.primaryText)
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('POZSTAR ASSISTÊNCIA TÉCNICA ESPECIALIZADA', textLeft, textY, {
         width: textWidth,
         align: 'right'
       });

    // Linha cinza clara
    const headerBottom = logoY + logoBox + 8;
    doc.moveTo(left, headerBottom).lineTo(right, headerBottom)
       .strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();

    // Título centralizado em azul
    yPosition = headerBottom + 14;
    doc.fillColor(this.COLORS.accent)
       .font('Helvetica-Bold')
       .fontSize(15)
       .text(this.RECEIPT_TITLE, left, yPosition, { width, align: 'center' });

    return yPosition + 30;
  }

  private static addSubtitle(doc: any, orderNumber: string, yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.secondaryText)
       .font('Helvetica')
       .fontSize(11)
       .text(`Comprovante gerado automaticamente — Ordem de Serviço nº ${orderNumber}`, left, yPosition, {
         width,
         align: 'center'
       });

    return yPosition + 24;
  }

  private static addClientSection(doc: any, client: ServiceOrderData['client'], yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DADOS DO CLIENTE', left, yPosition);
    yPosition += 12;
    doc.moveTo(left, yPosition).lineTo(right, yPosition)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    yPosition += 10;

    const colGap = 20;
    const colWidth = (width - colGap) / 2;
    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11);

    // Coluna esquerda
    doc.text(`Nome completo: ${client.name ?? '-'}`, left, yPosition, { width: colWidth });
    yPosition += 16;
    doc.text(`Documento (RG/CPF): ${client.document ?? '-'}`, left, yPosition, { width: colWidth });
    yPosition += 16;
    doc.text(`Telefone: ${client.phone ?? '-'}`, left, yPosition, { width: colWidth });

    // Coluna direita
    const rightTop = yPosition - 32;
    doc.text(`E-mail: ${client.email ?? '-'}`, left + colWidth + colGap, rightTop, { width: colWidth });
    const fullAddress = [client.address, client.neighborhood, client.city, client.state, client.zipCode]
      .filter(Boolean).join(', ');
    doc.text(`Endereço completo: ${fullAddress || '-'}`, left + colWidth + colGap, rightTop + 16, { width: colWidth });

    yPosition += 30;
    return yPosition;
  }

  private static addEquipmentSection(doc: any, serviceOrder: ServiceOrderData, yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DADOS DO EQUIPAMENTO', left, yPosition);
    yPosition += 12;
    doc.moveTo(left, yPosition).lineTo(right, yPosition)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    yPosition += 10;

    const colGap = 20;
    const colWidth = (width - colGap) / 2;
    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11);

    // Coluna esquerda
    doc.text(`Tipo: ${serviceOrder.equipmentType ?? '-'}`, left, yPosition, { width: colWidth });
    yPosition += 16;
    doc.text(`Marca: ${serviceOrder.brand ?? '-'}`, left, yPosition, { width: colWidth });
    yPosition += 16;
    doc.text(`Modelo: ${serviceOrder.model ?? '-'}`, left, yPosition, { width: colWidth });

    // Coluna direita
    const rightTop = yPosition - 32;
    doc.text(`Número de série / identificação: ${serviceOrder.serialNumber ?? '-'}`, left + colWidth + colGap, rightTop, { width: colWidth });
    // Removido campo "Cor" conforme solicitação
    yPosition += 20;
    return yPosition;
  }

  private static addDefectSection(doc: any, reportedDefect: string, yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DEFEITO / MOTIVO DA ENTREGA', left, yPosition);
    yPosition += 12;
    doc.moveTo(left, yPosition).lineTo(right, yPosition)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    yPosition += 10;

    doc.fillColor(this.COLORS.primaryText).font('Helvetica-Oblique').fontSize(11)
      .text(reportedDefect, left, yPosition, {
        width: right - left,
        align: 'justify',
        lineGap: 5
      });

    return yPosition + 30;
  }

  private static addAccessoriesSection(doc: any, accessories: string | undefined, yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('ACESSÓRIOS RECEBIDOS', left, yPosition);
    yPosition += 12;
    doc.moveTo(left, yPosition).lineTo(right, yPosition)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    yPosition += 10;

    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11);

    const items = (accessories ?? '')
      .split(/\n|,|;|\|/)
      .map(s => s.trim())
      .filter(Boolean);
    if (items.length > 0) {
      items.forEach(item => {
        doc.text(`• ${item}`, left, yPosition);
        yPosition += 14;
      });
    } else {
      doc.text('Nenhum acessório recebido.', left, yPosition);
      yPosition += 14;
    }

    return yPosition + 10;
  }

  private static addDatesSection(doc: any, serviceOrder: ServiceOrderData, yPosition: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DATAS E IDENTIFICAÇÃO', left, yPosition);
    yPosition += 12;
    doc.moveTo(left, yPosition).lineTo(right, yPosition)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    yPosition += 10;

    const colGap = 20;
    const colWidth = (width - colGap) / 2;
    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11);

    if (serviceOrder.arrivalDate) {
      doc.text(`Data de chegada: ${serviceOrder.arrivalDate.toLocaleDateString('pt-BR')}`, left, yPosition, { width: colWidth });
    } else {
      doc.text(`Data de chegada: -`, left, yPosition, { width: colWidth });
    }
    yPosition += 16;
    doc.text(`Usuário responsável: ${serviceOrder.createdBy?.name ?? '-'}`, left, yPosition, { width: colWidth });

    const now = new Date();
    const rightTop = yPosition - 16;
    doc.text(`Data/hora de geração: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, left + colWidth + colGap, rightTop, { width: colWidth });
    doc.text(`Local/unidade: Pozstar - Assistência Técnica`, left + colWidth + colGap, rightTop + 16, { width: colWidth });

    yPosition += 30;
    return yPosition;
  }

  private static addReceiptTerms(doc: any, client: ServiceOrderData['client'], yPosition: number): number {
    // Nova página se necessário
    if (yPosition > (doc.page.height - doc.page.margins.bottom - 250)) {
      doc.addPage({ size: 'A4', margins: doc.page.margins });
      yPosition = doc.page.margins.top;
    }

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // Título
    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('TERMO DE RECEBIMENTO DIGITAL – POZSTAR', left, yPosition);
    yPosition += 12;
    doc.moveTo(left, yPosition).lineTo(right, yPosition)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    yPosition += 10;

    // Texto do termo com substituições
    const termsText = this.RECEIPT_TERMS
      .replace('{CLIENT_NAME}', client.name)
      .replace('{CLIENT_DOCUMENT}', client.document || '[não informado]');

    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11)
      .text(termsText, left, yPosition, {
        width,
        align: 'justify',
        lineGap: 5
      });
    // Espaço final após o termo (evita sobreposição com outras seções)
    yPosition = doc.y + 16;
    return yPosition;
  }

  private static addFooter(doc: any, qrCodeDataURL: string, serviceOrderId: string) {
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const footerY = pageHeight - doc.page.margins.bottom - 90;

    // Linha separadora
    doc.strokeColor(this.COLORS.divider).lineWidth(0.6)
      .moveTo(left, footerY)
      .lineTo(right, footerY)
      .stroke();

    const nowFooter = new Date();
    // Texto centralizado
    doc.fillColor('#666666').font('Helvetica').fontSize(9)
      .text('Comprovante digital emitido automaticamente pelo sistema Pozstar — validade jurídica mediante registro eletrônico.', left, footerY + 10, { width, align: 'center' });

    // Metadados à esquerda
    doc.fillColor(this.COLORS.secondaryText).fontSize(9)
      .text(`ID do comprovante: ${serviceOrderId}`, left, footerY + 28)
      .text(`Data/hora de emissão: ${nowFooter.toLocaleDateString('pt-BR')} ${nowFooter.toLocaleTimeString('pt-BR')}`, left, footerY + 42)
      .text('Política de guarda: 90 dias após comunicação de disponibilidade', left, footerY + 56)
      .text(`Versão do template: v${this.TEMPLATE_VERSION}`, left, footerY + 70);

    // QR Code (2x2cm ~ 57pt) reposicionado para evitar sobreposição com o texto central
    try {
      const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
      const imgSize = 57;
      // Posiciona o QR alguns pixels abaixo do texto central e paralelo aos metadados
      doc.image(qrCodeBuffer, right - imgSize, footerY + 28, { width: imgSize, height: imgSize });
    } catch {}
  }

  /**
   * Gera o nome do arquivo PDF
   */
  static generateFileName(orderNumber: string): string {
    // Novo padrão solicitado: "Ordem de Servico ${orderNumber}.pdf" (sem parênteses)
    const safeOrderNumber = String(orderNumber).replace(/["<>\\/:|?*]/g, '').trim();
    return `Ordem de Servico ${safeOrderNumber}.pdf`;
  }
}