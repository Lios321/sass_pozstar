import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';

export interface ExitReceiptItem {
  type: 'PECA' | 'SERVICO';
  title: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
  estimatedHours?: number;
}

interface ClientData {
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
}

interface ExitReceiptData {
  id: string;
  orderNumber: string;
  client: ClientData;
  equipmentType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  color?: string;
  reportedDefect: string;
  technicalExplanation?: string;
  items: ExitReceiptItem[];
  createdAt: Date;
  finishedAt: Date;
}

export interface ExitReceiptMetadata {
  buffer: Buffer;
  filename: string;
  size: number;
  generatedAt: Date;
}

export class ExitReceiptGenerator {
  private static readonly COLORS = {
    background: '#FFFFFF',
    panel: '#F7F9FC',
    primaryText: '#333333',
    secondaryText: '#555555',
    accent: '#0077FF',
    accentSoft: '#4DA3FF',
    divider: '#DDDDDD',
  } as const;

  private static readonly TEMPLATE_VERSION = '1.0';

  private static readonly TERMS = `TERMO DE ENTREGA E GARANTIA – POZSTAR

1. Recebimento e Conferência
Declaro ter recebido o equipamento descrito neste documento em perfeitas condições de funcionamento e estética, conferindo os serviços realizados e peças substituídas, bem como a devolução dos acessórios entregues (se houver).

2. Garantia dos Serviços
A Pozstar concede garantia de 90 (noventa) dias sobre os serviços executados e peças substituídas, contados a partir da data de retirada deste equipamento, em conformidade com o artigo 26 do Código de Defesa do Consumidor.

3. Cobertura da Garantia
A garantia cobre exclusivamente:
• Defeitos de fabricação das peças substituídas;
• Falhas na execução do serviço técnico realizado.

4. Exclusões da Garantia (Perda do Benefício)
A garantia será automaticamente invalidada caso seja constatado:
• Mau uso, quedas, impactos físicos ou danos na tela/carcaça posteriores à entrega;
• Contato com líquidos, umidade excessiva ou oxidação (exceto se o serviço contratado cobrir especificamente estes itens);
• Rompimento ou violação dos selos de garantia da Pozstar;
• Intervenção técnica por terceiros ou abertura do equipamento por pessoa não autorizada;
• Problemas de software, vírus, ou configurações alteradas pelo usuário (salvo se o serviço foi de software).

5. Disposições Finais
Ao retirar o equipamento, o cliente dá plena quitação dos serviços contratados. Este documento deve ser apresentado em caso de eventual retorno em garantia.`;

  // Formatação numérica (pt-BR)
  private static brMoney(value: number): string {
    const v = Number(value || 0);
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
    } catch {
      return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
  private static brInt(value: number): string {
    const v = Number(value || 0);
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  static generateFileName(orderNumber: string) {
    const safeOrder = `${orderNumber}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `SAIDA_OS_${safeOrder}.pdf`;
  }

  static async generateExitReceipt(data: ExitReceiptData): Promise<ExitReceiptMetadata> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc: any = new PDFDocument({ autoFirstPage: false });
        try { doc.font('Helvetica'); } catch {}

        doc.addPage({
          size: 'A4',
          margins: { top: 71, bottom: 71, left: 71, right: 71 }
        });

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
            filename: this.generateFileName(data.orderNumber),
            size: buffer.length,
            generatedAt: new Date(),
          });
        });

        let qrCodeDataURL = '';
        try {
          const baseUrl = process.env.NEXTAUTH_URL || '';
          qrCodeDataURL = await QRCode.toDataURL(
            `${baseUrl}/dashboard/service-orders/${data.id}`,
            { width: 100, margin: 1 }
          );
        } catch {}

        await this.buildPDF(doc, data, qrCodeDataURL);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private static addHeader(doc: any, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // Logo
    const logoSize = 90;
    const logoX = left + 25;
    const logoY = y + 20;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      doc.image(logoBuffer, logoX, logoY, { fit: [logoSize, logoSize] });
    } catch {
      doc.rect(logoX, logoY, logoSize, logoSize)
        .fillColor(this.COLORS.accent)
        .fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(32)
        .text('P', logoX + (logoSize / 2) - 10, logoY + (logoSize / 2) - 14);
    }

    // Nome da empresa
    const textLeft = logoX + logoSize + 12;
    const textWidth = right - textLeft;
    const textY = logoY + (logoSize / 2) - 6;
    doc.fillColor(this.COLORS.primaryText)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('POZSTAR ASSISTÊNCIA TÉCNICA ESPECIALIZADA', textLeft, textY, {
        width: textWidth,
        align: 'right'
      });

    // Título
    const headerBottom = logoY + logoSize + 8;
    doc.moveTo(left, headerBottom).lineTo(right, headerBottom)
      .strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();

    y = headerBottom + 14;
    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(15)
      .text('COMPROVANTE DE ENTREGA / TERMO DE GARANTIA', left, y, { width, align: 'center' });

    return y + 30;
  }

  private static addSubtitle(doc: any, orderNumber: string, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.secondaryText)
      .font('Helvetica')
      .fontSize(11)
      .text(`Documento de Saída — Ordem de Serviço nº ${orderNumber}`,
        left, y, { width, align: 'center' });
    return y + 24;
  }

  private static addClientSection(doc: any, client: ClientData, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DADOS DO CLIENTE', left, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;

    const colGap = 20;
    const colWidth = (width - colGap) / 2;
    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11);

    // Coluna esquerda
    doc.text(`Nome completo: ${client.name ?? '-'}`, left, y, { width: colWidth });
    y += 16;
    doc.text(`Documento (RG/CPF): ${client.document ?? '-'}`, left, y, { width: colWidth });
    y += 16;
    doc.text(`Telefone: ${client.phone ?? '-'}`, left, y, { width: colWidth });

    // Coluna direita
    const rightTop = y - 32;
    doc.text(`E-mail: ${client.email ?? '-'}`, left + colWidth + colGap, rightTop, { width: colWidth });
    const fullAddress = [client.address, client.neighborhood, client.city, client.state, client.zipCode]
      .filter(Boolean).join(', ');
    doc.text(`Endereço completo: ${fullAddress || '-'}`, left + colWidth + colGap, rightTop + 16, { width: colWidth });

    y += 30;
    return y;
  }

  private static addEquipmentSection(doc: any, data: ExitReceiptData, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DADOS DO EQUIPAMENTO', left, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;

    const colGap = 20;
    const colWidth = (width - colGap) / 2;
    doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11);

    // Coluna esquerda
    doc.text(`Tipo: ${data.equipmentType ?? '-'}`, left, y, { width: colWidth });
    y += 16;
    doc.text(`Marca: ${data.brand ?? '-'}`, left, y, { width: colWidth });
    y += 16;
    doc.text(`Modelo: ${data.model ?? '-'}`, left, y, { width: colWidth });

    // Coluna direita
    const rightTop = y - 32;
    doc.text(`Número de série / identificação: ${data.serialNumber ?? '-'}`, left + colWidth + colGap, rightTop, { width: colWidth });
    doc.text(`Cor: ${data.color ?? '-'}`, left + colWidth + colGap, rightTop + 16, { width: colWidth });

    y += 30;
    return y;
  }

  private static addItemsTable(doc: any, items: ExitReceiptItem[], y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('SERVIÇOS REALIZADOS E PEÇAS SUBSTITUÍDAS', left, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;

    // Cabeçalho
    const headers = ['Descrição', 'Qtd', 'Unitário', 'Total'];
    const gap = 16;
    const totalW = 100;
    const unitW = 95;
    const qtyW = 60;
    const totalX = right - totalW;
    const unitX = totalX - gap - unitW;
    const qtyX = unitX - gap - qtyW;
    const descX = left;
    const descW = Math.max(140, qtyX - gap - descX);

    doc.save();
    doc.rect(left, y - 3, width, 24).fillColor(this.COLORS.panel).fill();
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(10).fillColor(this.COLORS.accent);
    doc.text(headers[0], descX, y, { width: descW });
    doc.text(headers[1], qtyX, y, { width: qtyW, align: 'center' });
    doc.text(headers[2], unitX, y, { width: unitW, align: 'right' });
    doc.text(headers[3], totalX, y, { width: totalW, align: 'right' });
    y += 20;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(10);
    let subtotal = 0;
    let rowIndex = 0;
    const baseRowHeight = 22;

    for (const item of items) {
      rowIndex++;
      const total = (item.quantity || 0) * (item.unitPrice || 0);
      subtotal += total;

      const labelText = item.type === 'PECA' ? '[Peça] ' : '[Serviço] ';
      doc.font('Helvetica').fontSize(10);
      const descHeight = doc.heightOfString(`${labelText}${item.title}`, { width: descW, lineGap: 2 });
      const rowHeight = Math.max(baseRowHeight, descHeight);

      if (rowIndex % 2 === 1) {
        doc.save();
        doc.rect(left, y - 2, width, rowHeight + 4).fillColor('#FAFBFD').fill();
        doc.restore();
      }

      doc.font('Helvetica-Bold').fillColor(this.COLORS.accent);
      const labelW = doc.widthOfString(labelText);
      doc.text(labelText, descX, y, { width: descW, lineBreak: false });
      doc.font('Helvetica').fillColor(this.COLORS.primaryText);
      doc.text(item.title, descX + labelW, y, { width: Math.max(0, descW - labelW), lineGap: 2 });
      
      const qtyText = item.type === 'SERVICO' ? '' : this.brInt(item.quantity ?? 0);
      doc.text(qtyText, qtyX, y, { width: qtyW, align: 'center', lineBreak: false });
      doc.text(this.brMoney(item.unitPrice ?? 0), unitX, y, { width: unitW, align: 'right', lineBreak: false });
      doc.text(this.brMoney(total), totalX, y, { width: totalW, align: 'right', lineBreak: false });
      y += rowHeight;

      if (y > doc.page.height - doc.page.margins.bottom - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    y += 8;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    y += 8;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(this.COLORS.primaryText)
      .text(`Valor Total dos Serviços: ${this.brMoney(subtotal)}`, left, y, { width, align: 'right' });

    return y + 30;
  }

  private static addNotesAndTerms(doc: any, technicalExplanation: string | undefined, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    
    if (y > (doc.page.height - doc.page.margins.bottom - 250)) {
      doc.addPage({ size: 'A4', margins: doc.page.margins });
      y = doc.page.margins.top;
    }

    if (technicalExplanation && technicalExplanation.trim().length > 0) {
      doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
        .text('EXPLICAÇÃO TÉCNICA FINAL', left, y);
      y += 12;
      doc.moveTo(left, y).lineTo(right, y)
        .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
      y += 10;
      doc.font('Helvetica').fontSize(11).fillColor(this.COLORS.secondaryText)
        .text(technicalExplanation, left, y, { width, align: 'justify', lineGap: 4 });
      y = doc.y + 16;
    }

    doc.fillColor(this.COLORS.secondaryText).font('Helvetica-Bold').fontSize(11)
      .text('TERMOS DE ENTREGA E GARANTIA', left, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor(this.COLORS.secondaryText)
      .text(this.TERMS, left, y, { width, align: 'justify', lineGap: 4 });

    return doc.y + 16;
  }

  private static addFooter(doc: any, qrCodeDataURL: string, id: string) {
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const footerY = pageHeight - doc.page.margins.bottom - 90;

    doc.strokeColor(this.COLORS.divider).lineWidth(0.6)
      .moveTo(left, footerY)
      .lineTo(right, footerY)
      .stroke();

    doc.fillColor('#666666').font('Helvetica').fontSize(9)
      .text('Comprovante de entrega emitido automaticamente pelo sistema Pozstar.', left, footerY + 10, { width, align: 'center' });

    const nowFooter = new Date();
    doc.fillColor(this.COLORS.secondaryText).fontSize(9)
      .text(`ID da OS: ${id}`, left, footerY + 28)
      .text(`Data/hora de emissão: ${nowFooter.toLocaleDateString('pt-BR')} ${nowFooter.toLocaleTimeString('pt-BR')}`, left, footerY + 42)
      .text(`Versão do template: v${this.TEMPLATE_VERSION}`, left, footerY + 56);

    try {
      const data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(data, 'base64');
      const imgSize = 57;
      doc.image(imageBuffer, right - imgSize, footerY + 28, { width: imgSize, height: imgSize });
    } catch {}
  }

  private static async buildPDF(doc: any, data: ExitReceiptData, qrCodeDataURL: string) {
    let y = doc.page.margins.top;

    y = this.addHeader(doc, y);
    y = this.addSubtitle(doc, data.orderNumber, y);
    y = this.addClientSection(doc, data.client, y);
    y = this.addEquipmentSection(doc, data, y);
    y = this.addItemsTable(doc, data.items, y);
    y = this.addNotesAndTerms(doc, data.technicalExplanation, y);
    this.addFooter(doc, qrCodeDataURL, data.id);
  }
}
