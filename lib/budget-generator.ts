import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface BudgetItem {
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

interface BudgetData {
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
  budgetNote?: string;
  items: BudgetItem[];
  createdAt: Date;
}

export interface BudgetMetadata {
  buffer: Buffer;
  filename: string;
  size: number;
  generatedAt: Date;
}

export class BudgetGenerator {
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

  private static readonly TERMS = `1. Identificação da Empresa\n
A POZSTAR REPAROS ELETRÔNICOS, doravante denominada "Prestadora", atua no segmento de manutenção e reparação de equipamentos eletrônicos, comprometendo-se com a transparência, segurança e qualidade em todos os serviços prestados.\n

2. Objeto do Orçamento\n
O presente orçamento tem por finalidade informar ao Cliente o custo estimado para diagnóstico, reparo, substituição de peças e demais serviços técnicos necessários para o bom funcionamento do equipamento entregue.\n

3. Validade do Orçamento\n
O orçamento emitido possui validade de 15 (quinze) dias corridos a partir da data de emissão. Após esse período, valores e prazos poderão ser reajustados conforme variações de mercado ou disponibilidade de peças.\n

4. Aprovação do Serviço\n
O serviço somente será executado mediante aprovação expressa do Cliente, verbalmente, por escrito ou via meio eletrônico.\n
Caso o orçamento não seja aprovado, o equipamento será devolvido ao Cliente nas mesmas condições em que foi recebido, podendo haver cobrança de taxa de diagnóstico técnico, conforme tabela vigente.\n

5. Prazos de Execução\n
O prazo estimado para conclusão do serviço será informado após a aprovação do orçamento, podendo variar conforme a complexidade do reparo e disponibilidade de peças. A Prestadora compromete-se a manter o Cliente informado sobre eventuais atrasos ou alterações.\n

6. Garantia dos Serviços\n
Os serviços realizados possuem garantia de 90 (noventa) dias a contar da data da retirada do equipamento, conforme o Código de Defesa do Consumidor (Lei nº 8.078/90).\n
A garantia cobre somente o serviço executado e as peças substituídas, não abrangendo danos decorrentes de mau uso, quedas, umidade, ligações elétricas inadequadas ou intervenção de terceiros.\n

7. Responsabilidade sobre Dados e Acessórios\n
A Prestadora não se responsabiliza por perda de dados, configurações, programas, arquivos pessoais, cartões de memória, cabos, controles ou quaisquer acessórios não listados na ficha de recebimento do equipamento.\n

8. Equipamentos Não Retirados\n
Equipamentos não retirados em até 90 (noventa) dias após a conclusão do serviço ou após a recusa do orçamento poderão ser considerados abandonados, sendo destinados ao descarte ou aproveitamento técnico, conforme previsto em lei.\n

9. Autorização Parcial de Reparo (opcional)\n
O Cliente poderá autorizar previamente reparos de até R$ _______ (valor máximo) sem necessidade de novo contato para aprovação. Serviços acima desse valor dependerão de nova autorização.\n

10. Registro Fotográfico e Diagnóstico\n
A Prestadora poderá realizar registros fotográficos do equipamento antes, durante e após o reparo, exclusivamente para fins técnicos e comprobatórios, garantindo o sigilo e uso interno dessas imagens.\n

11. Disposições Finais\n
Ao aprovar este orçamento, o Cliente declara estar ciente e de acordo com todos os termos acima descritos.\n
Qualquer situação não prevista neste documento será analisada conforme o Código de Defesa do Consumidor e demais legislações aplicáveis.`;

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
  private static brDecimal(value: number, digits = 1): string {
    const v = Number(value || 0);
    return v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  static generateFileName(orderNumber: string) {
    const safeOrder = `${orderNumber}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `ORCAMENTO_OS_${safeOrder}.pdf`;
  }

  static async generateBudget(data: BudgetData): Promise<BudgetMetadata> {
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
<<<<<<< Updated upstream
    
    // Fallback visual (sem acesso ao sistema de arquivos no Edge)
=======

    // Fallback visual (Edge compatible - no filesystem access)
>>>>>>> Stashed changes
    doc.rect(logoX, logoY, logoSize, logoSize)
      .fillColor(this.COLORS.accent)
      .fill();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(32)
      .text('P', logoX + (logoSize / 2) - 10, logoY + (logoSize / 2) - 14);
<<<<<<< Updated upstream
=======

    /*
    // Disabled for Edge compatibility - cannot read from filesystem
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
    */
>>>>>>> Stashed changes

    // Nome da empresa à direita (estilo do recibo)
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
      .text('ORÇAMENTO TÉCNICO', left, y, { width, align: 'center' });

    return y + 30;
  }

  private static addSubtitle(doc: any, orderNumber: string, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.secondaryText)
      .font('Helvetica')
      .fontSize(11)
      .text(`Orçamento gerado automaticamente — Ordem de Serviço nº ${orderNumber}`,
        left, y, { width, align: 'center' });
    return y + 24;
  }

  private static addClientSection(doc: any, client: ClientData, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    // Título e divisória (estilo do recibo)
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

  private static addEquipmentSection(doc: any, data: BudgetData, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    // Título e divisória
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

    // Defeito relatado (texto corrido abaixo)
    y += 30;
    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('DEFEITO RELATADO', left, y);
    y += 10;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;
    doc.fillColor(this.COLORS.primaryText).font('Helvetica-Oblique').fontSize(11)
      .text(data.reportedDefect, left, y, { width, align: 'justify', lineGap: 5 });
    y = doc.y + 16;

    // Explicação técnica (opcional, agregada ao orçamento)
    if (data.technicalExplanation && data.technicalExplanation.trim().length > 0) {
      doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
        .text('EXPLICAÇÃO TÉCNICA', left, y);
      y += 10;
      doc.moveTo(left, y).lineTo(right, y)
        .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
      y += 10;
      doc.fillColor(this.COLORS.primaryText).font('Helvetica').fontSize(11)
        .text(data.technicalExplanation, left, y, { width, align: 'justify', lineGap: 5 });
      y = doc.y + 16;
    }

    return y;
  }

  private static addItemsTable(doc: any, items: BudgetItem[], y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
      .text('ITENS DO ORÇAMENTO', left, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;

    // Cabeçalho com fundo suave (posicionamento ancorado pela direita)
    const headers = ['Descrição', 'Qtd', 'Unitário', 'Dias', 'Total'];
    // Sem coluna "Tipo": o tipo vira um badge dentro da Descrição
    const gap = 16;
    const totalW = 100; // mais espaço para "R$ 1.234,56"
    const daysW = 60;   // dias/horas com decimal
    const unitW = 95;   // unitário em moeda BRL
    const qtyW = 60;    // quantidade inteira
    const totalX = right - totalW;
    const daysX = totalX - gap - daysW;
    const unitX = daysX - gap - unitW;
    const qtyX = unitX - gap - qtyW;
    const descX = left;
    const descW = Math.max(140, qtyX - gap - descX); // largura dinâmica para descrição
    doc.save();
    // Fundo do cabeçalho com leve altura extra para respiração visual
    doc.rect(left, y - 3, width, 24).fillColor(this.COLORS.panel).fill();
    doc.restore();
    // Linhas verticais de separação no cabeçalho para clareza visual
    // Divisórias verticais (sem coluna Tipo)
    doc.moveTo(qtyX - gap / 2, y - 3).lineTo(qtyX - gap / 2, y + 21)
      .strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    doc.moveTo(unitX - gap / 2, y - 3).lineTo(unitX - gap / 2, y + 21)
      .strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    doc.moveTo(daysX - gap / 2, y - 3).lineTo(daysX - gap / 2, y + 21)
      .strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    doc.moveTo(totalX - gap / 2, y - 3).lineTo(totalX - gap / 2, y + 21)
      .strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(this.COLORS.accent);
    doc.text(headers[0], descX, y, { width: descW });
    doc.text(headers[1], qtyX, y, { width: qtyW, align: 'center' });
    doc.text(headers[2], unitX, y, { width: unitW, align: 'right' });
    doc.text(headers[3], daysX, y, { width: daysW, align: 'center' });
    doc.text(headers[4], totalX, y, { width: totalW, align: 'right' });
    y += 20;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(this.COLORS.divider).lineWidth(0.6).stroke();
    y += 8;

    // Linhas
    doc.font('Helvetica').fontSize(10);
    let subtotal = 0;
    let totalDays = 0;
    let rowIndex = 0;
    // Altura base da linha; será ajustada dinamicamente por item
    const baseRowHeight = 22;
    for (const item of items) {
      rowIndex++;
      const total = (item.quantity || 0) * (item.unitPrice || 0);
      subtotal += total;
      totalDays += (item.estimatedHours ?? 0);

      // Zebra stripe para legibilidade
      if (rowIndex % 2 === 1) {
        doc.save();
        // Ajustaremos a altura após medir o texto; por ora, preencheremos depois
        doc.restore();
      }

      // Medir altura da descrição (inclui badge + texto)
      const labelText = item.type === 'PECA' ? '[Peça] ' : '[Serviço] ';
      doc.font('Helvetica').fontSize(10);
      const descHeight = doc.heightOfString(`${labelText}${item.title}`, { width: descW, lineGap: 2 });
      const rowHeight = Math.max(baseRowHeight, descHeight);

      // Reaplicar zebra stripe com altura correta
      if (rowIndex % 2 === 1) {
        doc.save();
        doc.rect(left, y - 2, width, rowHeight + 4).fillColor('#FAFBFD').fill();
        doc.restore();
      }

      // Descrição com badge de tipo prefixado
      doc.font('Helvetica-Bold').fillColor(this.COLORS.accent);
      const labelW = doc.widthOfString(labelText);
      doc.text(labelText, descX, y, { width: descW, lineBreak: false });
      doc.font('Helvetica').fillColor(this.COLORS.primaryText);
      doc.text(item.title, descX + labelW, y, { width: Math.max(0, descW - labelW), lineGap: 2 });
      // Evitar quebra automática e forçar alinhamentos corretos
      const qtyText = item.type === 'SERVICO' ? '' : this.brInt(item.quantity ?? 0);
      doc.text(qtyText, qtyX, y, { width: qtyW, align: 'center', lineBreak: false });
      doc.text(this.brMoney(item.unitPrice ?? 0), unitX, y, { width: unitW, align: 'right', lineBreak: false });
      // Dias sem casas decimais para peças e serviços
      const daysText = this.brInt(item.estimatedHours ?? 0);
      doc.text(daysText, daysX, y, { width: daysW, align: 'center', lineBreak: false });
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
      .text(`Subtotal: ${this.brMoney(subtotal)}`, left, y, { width, align: 'right' });
    y += 18;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(this.COLORS.primaryText)
      .text(`Total de dias para conclusão: ${this.brInt(totalDays)}`, left, y, { width, align: 'right' });

    return y + 24;
  }

  private static addNotesAndTerms(doc: any, note: string | undefined, y: number): number {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    // Espaço de segurança para o rodapé; quebra de página se necessário
    const safetySpace = 250;
    if (y > (doc.page.height - doc.page.margins.bottom - safetySpace)) {
      doc.addPage({ size: 'A4', margins: doc.page.margins });
      y = doc.page.margins.top;
    }

    if (note && note.trim().length > 0) {
      doc.fillColor(this.COLORS.accent).font('Helvetica-Bold').fontSize(13)
        .text('OBSERVAÇÕES', left, y);
      y += 12;
      doc.moveTo(left, y).lineTo(right, y)
        .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
      y += 10;
      doc.font('Helvetica').fontSize(11).fillColor(this.COLORS.secondaryText)
        .text(note, left, y, { width, align: 'justify', lineGap: 4 });
      y = doc.y + 16;
    }

    // Título dos Termos em cinza e ainda menor
    doc.fillColor(this.COLORS.secondaryText).font('Helvetica-Bold').fontSize(11)
      .text('TERMOS DO ORÇAMENTO – POZSTAR REPAROS ELETRÔNICOS', left, y);
    y += 12;
    doc.moveTo(left, y).lineTo(right, y)
      .strokeColor(this.COLORS.divider).lineWidth(0.5).stroke();
    y += 10;

    // Corpo dos Termos com fonte ainda menor e tom de cinza
    doc.font('Helvetica').fontSize(9).fillColor(this.COLORS.secondaryText)
      .text(this.TERMS, left, y, { width, align: 'justify', lineGap: 4 });

    // Novo y baseado na posição atual do cursor, evitando sobreposição com rodapé
    return doc.y + 16;
  }

  private static addFooter(doc: any, qrCodeDataURL: string, id: string) {
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

    // Texto centralizado
    doc.fillColor('#666666').font('Helvetica').fontSize(9)
      .text('Orçamento técnico emitido automaticamente pelo sistema Pozstar — validade 15 dias.', left, footerY + 10, { width, align: 'center' });

    // Metadados à esquerda
    const nowFooter = new Date();
    doc.fillColor(this.COLORS.secondaryText).fontSize(9)
      .text(`ID da OS: ${id}`, left, footerY + 28)
      .text(`Data/hora de emissão: ${nowFooter.toLocaleDateString('pt-BR')} ${nowFooter.toLocaleTimeString('pt-BR')}`, left, footerY + 42)
      .text(`Versão do template: v${this.TEMPLATE_VERSION}`, left, footerY + 56);

    // QR Code
    try {
      const data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(data, 'base64');
      const imgSize = 57;
      doc.image(imageBuffer, right - imgSize, footerY + 28, { width: imgSize, height: imgSize });
    } catch {}
  }

  private static async buildPDF(doc: any, data: BudgetData, qrCodeDataURL: string) {
    let y = doc.page.margins.top;

    y = this.addHeader(doc, y);
    y = this.addSubtitle(doc, data.orderNumber, y);
    y = this.addClientSection(doc, data.client, y);
    y = this.addEquipmentSection(doc, data, y);
    y = this.addItemsTable(doc, data.items, y);
    y = this.addNotesAndTerms(doc, data.budgetNote, y);
    this.addFooter(doc, qrCodeDataURL, data.id);
  }
}
