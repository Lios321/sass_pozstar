<<<<<<< Updated upstream
import { ReceiptGenerator } from './receipt-generator';
import type { BudgetItem } from './budget-generator';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const ReceiptDeliveryMethod = {
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
} as const;
export type ReceiptDeliveryMethod = (typeof ReceiptDeliveryMethod)[keyof typeof ReceiptDeliveryMethod];
=======
import { getDb } from '@/lib/db/drizzle';
import { serviceOrders, receiptDeliveries } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ReceiptGenerator } from './receipt-generator';
import type { BudgetItem } from './budget-generator';
// import * as fs from 'fs'; // Removed for Edge compatibility
// import * as path from 'path'; // Removed for Edge compatibility
import { v4 as uuidv4 } from 'uuid';

export enum ReceiptDeliveryMethod {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP'
}
>>>>>>> Stashed changes

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
  createdAt: Date | null;
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

      // Gera o PDF do comprovante (apenas para obter metadados se necessário, mas aqui só atualizamos o banco)
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
        createdAt: serviceOrder.createdAt || new Date(),
        createdBy: serviceOrder.createdBy || undefined,
      });

<<<<<<< Updated upstream
      // Atualiza o banco para marcar o comprovante como gerado
      // Nota: Não salvamos em disco no Edge/Workers. Apenas registramos que foi gerado.
      const db = getRequestContext().env.DB;
      await db.prepare(`
        UPDATE service_orders 
        SET receiptGenerated = 1, 
            receiptGeneratedAt = ?, 
            receiptPath = ? 
        WHERE id = ?
      `).bind(
        new Date().toISOString(), 
        receiptMetadata.filename, // Apenas o nome do arquivo, não o caminho completo
        serviceOrderId
      ).run();
=======
      // Salvar PDF no disco (storage/receipts ou diretório configurado)
      /*
      // Disabled for Edge compatibility - cannot write to filesystem
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
      */
      console.log(`ℹ️ Comprovante gerado em memória (não salvo em disco no ambiente Edge)`);

      // Atualiza o banco para marcar o comprovante como gerado
      const db = getDb();
      await db.update(serviceOrders)
        .set({
          receiptGenerated: true,
          receiptGeneratedAt: receiptMetadata.generatedAt,
          receiptPath: receiptMetadata.filename,
        })
        .where(eq(serviceOrders.id, serviceOrderId));
>>>>>>> Stashed changes

      console.log(`✅ Comprovante marcado como gerado para OS: ${serviceOrderId}`);
    } catch (error) {
      console.error(`❌ Erro ao gerar comprovante para OS ${serviceOrderId}:`, error);
      throw error;
    }
  }

  /**
   * Busca uma ordem de serviço com todos os relacionamentos necessários
   */
  private static async getServiceOrderWithRelations(serviceOrderId: string): Promise<ServiceOrderWithRelations | null> {
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB;
    
    // Consulta principal com JOINs
    const query = `
      SELECT 
        so.*,
        c.id as client_id, c.name as client_name, c.phone as client_phone, c.email as client_email,
        c.document as client_document, c.address as client_address, c.city as client_city,
        c.state as client_state, c.zipCode as client_zipCode, c.complement as client_complement,
        u.name as creator_name
      FROM service_orders so
      LEFT JOIN clients c ON so.clientId = c.id
      LEFT JOIN users u ON so.createdById = u.id
      WHERE so.id = ?
    `;

    const result = await db.prepare(query).bind(serviceOrderId).first();

    if (!result) return null;

    // Converter resultado plano para estrutura aninhada
    const so: any = result;
    
    return {
      id: so.id as string,
      orderNumber: so.orderNumber as string,
      equipmentType: so.equipmentType as string,
      brand: so.brand as string,
      model: so.model as string,
      serialNumber: so.serialNumber as string | null,
      color: so.color as string | null,
      reportedDefect: so.reportedDefect as string,
      technicalExplanation: so.technicalExplanation as string | null,
      receivedAccessories: so.receivedAccessories as string | null,
      arrivalDate: so.arrivalDate ? new Date(so.arrivalDate as string) : null,
      createdAt: new Date(so.createdAt as string),
      budgetNote: so.budgetNote as string | null,
      budgetItems: so.budgetItems ? (typeof so.budgetItems === 'string' ? JSON.parse(so.budgetItems) : so.budgetItems) : null,
      createdBy: so.creator_name ? {
        name: so.creator_name as string,
      } : null,
      client: {
        id: so.client_id as string,
        name: so.client_name as string,
        phone: so.client_phone as string,
        email: so.client_email as string | null,
        document: so.client_document as string | null,
        address: so.client_address as string | null,
        city: so.client_city as string | null,
        state: so.client_state as string | null,
        zipCode: so.client_zipCode as string | null,
        complement: so.client_complement as string | null,
      },
    };
=======
    const db = getDb();
    const result = await db.query.serviceOrders.findFirst({
      where: eq(serviceOrders.id, serviceOrderId),
      with: {
        client: {
          columns: {
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
          columns: {
            name: true,
          },
        },
      },
    });
    
    return result as ServiceOrderWithRelations | null;
>>>>>>> Stashed changes
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
        createdAt: serviceOrder.createdAt || new Date(),
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
<<<<<<< Updated upstream
    const db = getRequestContext().env.DB;
    const { results } = await db.prepare(`
      SELECT * FROM receipt_deliveries 
      WHERE serviceOrderId = ? 
      ORDER BY createdAt DESC
    `).bind(serviceOrderId).all();
=======
    const db = getDb();
    const deliveries = await db.query.receiptDeliveries.findMany({
      where: eq(receiptDeliveries.serviceOrderId, serviceOrderId),
      orderBy: [desc(receiptDeliveries.createdAt)],
    });
>>>>>>> Stashed changes

    return results;
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

      const db = getDb();
      const deliveryId = uuidv4();

      // Criar registro de entrega
<<<<<<< Updated upstream
      const db = getRequestContext().env.DB;
      const deliveryId = crypto.randomUUID();
      
      await db.prepare(`
        INSERT INTO receipt_deliveries (id, serviceOrderId, deliveryMethod, recipientEmail, recipientPhone, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        deliveryId,
        serviceOrderId,
        deliveryMethod,
        recipientEmail || null,
        recipientPhone || null,
        'PENDING',
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      // Simular envio (aqui você integraria com serviços reais de email/WhatsApp)
      // Por enquanto, vamos marcar como enviado com sucesso
      await db.prepare(`
        UPDATE receipt_deliveries
        SET status = 'SENT', sentAt = ?, updatedAt = ?
        WHERE id = ?
      `).bind(
        new Date().toISOString(),
        new Date().toISOString(),
        deliveryId
      ).run();
=======
      const delivery = await db.insert(receiptDeliveries).values({
        id: deliveryId,
        serviceOrderId,
        deliveryMethod,
        recipientEmail,
        recipientPhone,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Simular envio (aqui você integraria com serviços reais de email/WhatsApp)
      // Por enquanto, vamos marcar como enviado com sucesso
      await db.update(receiptDeliveries)
        .set({
          status: 'SENT',
          sentAt: new Date(),
        })
        .where(eq(receiptDeliveries.id, deliveryId));
>>>>>>> Stashed changes

      return true;
    } catch (error) {
      console.error('Erro ao reenviar comprovante:', error);
      
      // Tentar criar registro de falha se possível
      try {
<<<<<<< Updated upstream
        const db = getRequestContext().env.DB;
        const deliveryId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO receipt_deliveries (id, serviceOrderId, deliveryMethod, status, errorMessage, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          deliveryId,
          serviceOrderId,
          deliveryMethod,
          'FAILED',
          error instanceof Error ? error.message : 'Erro desconhecido',
          new Date().toISOString(),
          new Date().toISOString()
        ).run();
=======
        const db = getDb();
        await db.insert(receiptDeliveries).values({
          id: uuidv4(),
          serviceOrderId,
          deliveryMethod,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          createdAt: new Date(),
          updatedAt: new Date()
        });
>>>>>>> Stashed changes
      } catch (dbError) {
        console.error('Erro ao registrar falha:', dbError);
      }

      return false;
    }
  }
<<<<<<< Updated upstream
=======
  // === Orçamento ===
  // Gera e salva o PDF do orçamento com base nos budgetItems
  static async generateBudgetForOrcamentar(serviceOrderId: string): Promise<void> {
    try {
      const so = await this.getServiceOrderWithRelations(serviceOrderId);
      if (!so) throw new Error('Ordem de serviço não encontrada');

      // Normalizar itens de orçamento
      const rawItems = Array.isArray(so.budgetItems) ? so.budgetItems : [];
      const items: BudgetItem[] = rawItems.map((i: any): BudgetItem => ({
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
        createdAt: so.createdAt || new Date(),
      });

      try {
        /*
        // Disabled for Edge/Cloudflare compatibility
        const budgetsBaseDir = process.env.BUDGETS_DIR || path.join(process.cwd(), 'storage', 'budgets');
        fs.mkdirSync(budgetsBaseDir, { recursive: true });
        const safeFileName = budgetMetadata.filename.replace(/[\\\/:*?"<>|]/g, '_');
        const fullPath = path.join(budgetsBaseDir, safeFileName);
        fs.writeFileSync(fullPath, budgetMetadata.buffer);
        console.log(`💾 Orçamento salvo em: ${fullPath}`);
        */
        console.log(`ℹ️ Orçamento gerado em memória (não salvo em disco no ambiente Edge): ${budgetMetadata.filename}`);
      } catch (fileErr) {
        console.error('❌ Erro ao salvar orçamento no disco:', fileErr);
      }

      console.log(`✅ Orçamento gerado para OS ${serviceOrderId}: ${budgetMetadata.filename}`);
    } catch (err) {
      console.error('❌ Erro ao gerar orçamento:', err);
    }
  }
>>>>>>> Stashed changes

  // Novo: gerar orçamento para download (sem salvar em disco)
  static async getBudgetForDownload(serviceOrderId: string): Promise<{ buffer: Buffer; filename: string } | null> {
    try {
      console.log(`📥 Buscando orçamento para download - OS: ${serviceOrderId}`);

      const so = await this.getServiceOrderWithRelations(serviceOrderId);
      if (!so) return null;

      const rawItems = Array.isArray(so.budgetItems) ? so.budgetItems : [];
      const items: BudgetItem[] = rawItems.map((i: any): BudgetItem => ({
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
        createdAt: so.createdAt || new Date(),
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
