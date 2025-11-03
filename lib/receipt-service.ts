import { prisma } from './prisma';
import { ReceiptDeliveryMethod } from '@prisma/client';
import { ReceiptGenerator } from './receipt-generator';
import * as fs from 'fs';
import * as path from 'path';

interface ServiceOrderWithRelations {
  id: string;
  orderNumber: string;
  equipmentType: string;
  brand: string;
  model: string;
  serialNumber?: string | null;
  color?: string | null;
  reportedDefect: string;
  technicalExplanation?: string | null;
  receivedAccessories?: string | null;
  arrivalDate: Date | null;
  createdAt: Date;
  budgetNote?: string | null;
  budgetItems?: any | null;
  createdBy?: {
    name: string;
  } | null;
  client: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    document?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    complement?: string | null;
  };
}

export class ReceiptService {
  /**
   * Gera o comprovante e marca como gerado no banco de dados
   */
  static async generateReceiptForDownload(serviceOrderId: string): Promise<void> {
    try {
      console.log(`🚀 Iniciando geração do comprovante para OS: ${serviceOrderId}`);

      // Busca os dados da OS com relacionamentos
      const serviceOrder = await this.getServiceOrderWithRelations(serviceOrderId);
      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada');
      }

      // Gera o PDF do comprovante
      const receiptMetadata = await ReceiptGenerator.generateReceipt({
        id: serviceOrder.id,
        orderNumber: serviceOrder.orderNumber,
        client: {
          name: serviceOrder.client.name,
          phone: serviceOrder.client.phone,
          email: serviceOrder.client.email || undefined,
          document: serviceOrder.client.document || undefined,
          address: serviceOrder.client.address || undefined,
          city: serviceOrder.client.city || undefined,
          state: serviceOrder.client.state || undefined,
          zipCode: serviceOrder.client.zipCode || undefined,
          complement: serviceOrder.client.complement || undefined,
        },
        equipmentType: serviceOrder.equipmentType,
        brand: serviceOrder.brand,
        model: serviceOrder.model,
        serialNumber: serviceOrder.serialNumber || undefined,
        color: serviceOrder.color || undefined,
        reportedDefect: serviceOrder.reportedDefect,
        receivedAccessories: serviceOrder.receivedAccessories || undefined,
        arrivalDate: serviceOrder.arrivalDate || new Date(),
        createdAt: serviceOrder.createdAt,
        createdBy: serviceOrder.createdBy || undefined,
      });

      // Salvar PDF no disco (storage/receipts ou diretório configurado)
      try {
        const receiptsBaseDir = process.env.RECEIPTS_DIR || path.join(process.cwd(), 'storage', 'receipts');
        fs.mkdirSync(receiptsBaseDir, { recursive: true });
        const safeFileName = receiptMetadata.filename.replace(/[\\\/:*?"<>|]/g, '_');
        const fullPath = path.join(receiptsBaseDir, safeFileName);
        fs.writeFileSync(fullPath, receiptMetadata.buffer);
        console.log(`💾 Comprovante salvo em: ${fullPath}`);
      } catch (fileError) {
        console.error('❌ Erro ao salvar comprovante no disco:', fileError);
      }

      // Atualiza o banco para marcar o comprovante como gerado
      await prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          receiptGenerated: true,
          receiptGeneratedAt: receiptMetadata.generatedAt,
          receiptPath: receiptMetadata.filename,
        },
      });

      console.log(`✅ Comprovante gerado com sucesso para OS: ${serviceOrderId}`);
      console.log(`📄 Arquivo: ${receiptMetadata.filename}`);
      console.log(`📊 Tamanho: ${receiptMetadata.size} bytes`);
    } catch (error) {
      console.error(`❌ Erro ao gerar comprovante para OS ${serviceOrderId}:`, error);
      throw error;
    }
  }

  /**
   * Busca uma ordem de serviço com todos os relacionamentos necessários
   */
  private static async getServiceOrderWithRelations(serviceOrderId: string): Promise<ServiceOrderWithRelations | null> {
    return await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            document: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            complement: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Busca o comprovante para download
   */
  static async getReceiptForDownload(serviceOrderId: string): Promise<{ buffer: Buffer; filename: string } | null> {
    try {
      console.log(`📥 Buscando comprovante para download - OS: ${serviceOrderId}`);

      // Busca os dados da OS com relacionamentos
      const serviceOrder = await this.getServiceOrderWithRelations(serviceOrderId);
      if (!serviceOrder) {
        return null;
      }

      // Gera o PDF do comprovante
      const receiptMetadata = await ReceiptGenerator.generateReceipt({
        id: serviceOrder.id,
        orderNumber: serviceOrder.orderNumber,
        client: {
          name: serviceOrder.client.name,
          phone: serviceOrder.client.phone,
          email: serviceOrder.client.email || undefined,
          document: serviceOrder.client.document || undefined,
          address: serviceOrder.client.address || undefined,
          city: serviceOrder.client.city || undefined,
          state: serviceOrder.client.state || undefined,
          zipCode: serviceOrder.client.zipCode || undefined,
          complement: serviceOrder.client.complement || undefined,
        },
        equipmentType: serviceOrder.equipmentType,
        brand: serviceOrder.brand,
        model: serviceOrder.model,
        serialNumber: serviceOrder.serialNumber || undefined,
        color: serviceOrder.color || undefined,
        reportedDefect: serviceOrder.reportedDefect,
        receivedAccessories: serviceOrder.receivedAccessories || undefined,
        arrivalDate: serviceOrder.arrivalDate || new Date(),
        createdAt: serviceOrder.createdAt,
        createdBy: serviceOrder.createdBy || undefined,
      });

      console.log(`✅ Comprovante gerado para download - OS: ${serviceOrderId}`);
      console.log(`📊 Tamanho: ${receiptMetadata.size} bytes`);

      return {
        buffer: receiptMetadata.buffer,
        filename: receiptMetadata.filename,
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar comprovante para download - OS ${serviceOrderId}:`, error);
      throw error;
    }
  }

  /**
   * Gera o nome do arquivo PDF baseado na OS
   */
  static generateFileName(orderNumber: string): string {
    return ReceiptGenerator.generateFileName(orderNumber);
  }

  /**
   * Busca o histórico de entregas de comprovantes para uma OS
   */
  static async getDeliveryHistory(serviceOrderId: string) {
    const deliveries = await prisma.receiptDelivery.findMany({
      where: {
        serviceOrderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return deliveries;
  }

  /**
   * Reenvia o comprovante por um método específico
   */
  static async resendReceipt(serviceOrderId: string, deliveryMethod: ReceiptDeliveryMethod): Promise<boolean> {
    try {
      // Buscar a OS com dados do cliente
      const serviceOrder = await this.getServiceOrderWithRelations(serviceOrderId);
      
      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada');
      }

      // Determinar destinatário baseado no método
      let recipientEmail: string | undefined;
      let recipientPhone: string | undefined;

      if (deliveryMethod === ReceiptDeliveryMethod.EMAIL) {
         recipientEmail = serviceOrder.client.email || undefined;
         if (!recipientEmail) {
           throw new Error('Cliente não possui email cadastrado');
         }
       } else if (deliveryMethod === ReceiptDeliveryMethod.WHATSAPP) {
        recipientPhone = serviceOrder.client.phone;
        if (!recipientPhone) {
          throw new Error('Cliente não possui telefone cadastrado');
        }
      }

      // Criar registro de entrega
      const delivery = await prisma.receiptDelivery.create({
        data: {
          serviceOrderId,
          deliveryMethod,
          recipientEmail,
          recipientPhone,
          status: 'PENDING',
        },
      });

      // Simular envio (aqui você integraria com serviços reais de email/WhatsApp)
      // Por enquanto, vamos marcar como enviado com sucesso
      await prisma.receiptDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Erro ao reenviar comprovante:', error);
      
      // Tentar criar registro de falha se possível
      try {
        await prisma.receiptDelivery.create({
          data: {
            serviceOrderId,
            deliveryMethod,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          },
        });
      } catch (dbError) {
        console.error('Erro ao registrar falha:', dbError);
      }

      return false;
    }
  }
  // === Orçamento ===
  // Gera e salva o PDF do orçamento com base nos budgetItems
  static async generateBudgetForOrcamentar(serviceOrderId: string): Promise<void> {
    try {
      const so = await this.getServiceOrderWithRelations(serviceOrderId);
      if (!so) throw new Error('Ordem de serviço não encontrada');

      // Normalizar itens de orçamento
      const rawItems = Array.isArray(so.budgetItems) ? so.budgetItems : [];
      const items = rawItems.map((i: any) => ({
        type: i?.type === 'SERVICO' ? 'SERVICO' : 'PECA',
        title: String(i?.title ?? ''),
        quantity: Number(i?.quantity ?? 0),
        unitCost: i?.unitCost != null ? Number(i.unitCost) : undefined,
        unitPrice: Number(i?.unitPrice ?? 0),
        estimatedHours: i?.estimatedHours != null ? Number(i.estimatedHours) : undefined,
      }));

      // Evitar gerar orçamento vazio
      if (!items.length) {
        console.log('ℹ️ OS sem itens de orçamento; pulando geração de orçamento.');
        return;
      }

      const { BudgetGenerator } = await import('./budget-generator');
      const budgetMetadata = await BudgetGenerator.generateBudget({
        id: so.id,
        orderNumber: so.orderNumber,
        client: {
          name: so.client.name,
          phone: so.client.phone,
          email: so.client.email || undefined,
          document: so.client.document || undefined,
          address: so.client.address || undefined,
          city: so.client.city || undefined,
          state: so.client.state || undefined,
          zipCode: so.client.zipCode || undefined,
          complement: so.client.complement || undefined,
        },
        equipmentType: so.equipmentType,
        brand: so.brand,
        model: so.model,
        serialNumber: so.serialNumber || undefined,
        color: so.color || undefined,
        reportedDefect: so.reportedDefect,
        technicalExplanation: so.technicalExplanation || undefined,
        budgetNote: so.budgetNote || undefined,
        items,
        createdAt: so.createdAt,
      });

      try {
        const budgetsBaseDir = process.env.BUDGETS_DIR || path.join(process.cwd(), 'storage', 'budgets');
        fs.mkdirSync(budgetsBaseDir, { recursive: true });
        const safeFileName = budgetMetadata.filename.replace(/[\\\/:*?"<>|]/g, '_');
        const fullPath = path.join(budgetsBaseDir, safeFileName);
        fs.writeFileSync(fullPath, budgetMetadata.buffer);
        console.log(`💾 Orçamento salvo em: ${fullPath}`);
      } catch (fileErr) {
        console.error('❌ Erro ao salvar orçamento no disco:', fileErr);
      }

      console.log(`✅ Orçamento gerado para OS ${serviceOrderId}: ${budgetMetadata.filename}`);
    } catch (err) {
      console.error('❌ Erro ao gerar orçamento:', err);
    }
  }

  // Novo: gerar orçamento para download (sem salvar em disco)
  static async getBudgetForDownload(serviceOrderId: string): Promise<{ buffer: Buffer; filename: string } | null> {
    try {
      console.log(`📥 Buscando orçamento para download - OS: ${serviceOrderId}`);

      const so = await this.getServiceOrderWithRelations(serviceOrderId);
      if (!so) return null;

      const rawItems = Array.isArray(so.budgetItems) ? so.budgetItems : [];
      const items = rawItems.map((i: any) => ({
        type: i?.type === 'SERVICO' ? 'SERVICO' : 'PECA',
        title: String(i?.title ?? ''),
        quantity: Number(i?.quantity ?? 0),
        unitCost: i?.unitCost != null ? Number(i.unitCost) : undefined,
        unitPrice: Number(i?.unitPrice ?? 0),
        estimatedHours: i?.estimatedHours != null ? Number(i.estimatedHours) : undefined,
      }));

      if (!items.length) {
        throw new Error('Itens de orçamento ausentes para esta OS');
      }

      const { BudgetGenerator } = await import('./budget-generator');
      const budgetMetadata = await BudgetGenerator.generateBudget({
        id: so.id,
        orderNumber: so.orderNumber,
        client: {
          name: so.client.name,
          phone: so.client.phone,
          email: so.client.email || undefined,
          document: so.client.document || undefined,
          address: so.client.address || undefined,
          city: so.client.city || undefined,
          state: so.client.state || undefined,
          zipCode: so.client.zipCode || undefined,
          complement: so.client.complement || undefined,
        },
        equipmentType: so.equipmentType,
        brand: so.brand,
        model: so.model,
        serialNumber: so.serialNumber || undefined,
        color: so.color || undefined,
        reportedDefect: so.reportedDefect,
        technicalExplanation: so.technicalExplanation || undefined,
        budgetNote: so.budgetNote || undefined,
        items,
        createdAt: so.createdAt,
      });

      console.log(`✅ Orçamento gerado para download - OS: ${serviceOrderId}`);
      console.log(`📊 Tamanho: ${budgetMetadata.size} bytes`);

      return {
        buffer: budgetMetadata.buffer,
        filename: budgetMetadata.filename,
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar orçamento para download - OS ${serviceOrderId}:`, error);
      throw error;
    }
  }
}
