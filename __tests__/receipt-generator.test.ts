/**
 * @jest-environment node
 */
import { ReceiptGenerator } from '../lib/receipt-generator'

// Mock data for testing
const mockServiceOrderData = {
  id: 'test-id-123',
  orderNumber: 'OS-2024-001',
  client: {
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
    identity: '123.456.789-00',
    address: 'Rua das Flores, 123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567'
  },
  equipmentType: 'Smartphone',
  brand: 'Samsung',
  model: 'Galaxy S21',
  serialNumber: 'SN123456789',
  color: 'Preto',
  reportedDefect: 'Tela quebrada e não liga',
  receivedAccessories: 'Carregador, Cabo USB, Fone de ouvido',
  arrivalDate: new Date('2024-01-15'),
  createdAt: new Date('2024-01-15'),
  createdBy: {
    name: 'Técnico João'
  }
}

describe('ReceiptGenerator', () => {
  test('should generate PDF buffer successfully', async () => {
    const result = await ReceiptGenerator.generateReceipt(mockServiceOrderData)

    expect(result).toBeDefined()
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.buffer.length).toBeGreaterThan(0)
    expect(result.filename).toContain('OS-2024-001')
    expect(result.size).toBeGreaterThan(0)
    expect(result.generatedAt).toBeInstanceOf(Date)
  })

  test('should handle missing optional fields gracefully', async () => {
    const minimalData = {
      ...mockServiceOrderData,
      serialNumber: undefined,
      color: undefined,
      receivedAccessories: undefined,
      client: {
        ...mockServiceOrderData.client,
        email: undefined,
        identity: undefined,
        address: undefined,
        neighborhood: undefined,
        city: undefined,
        state: undefined,
        zipCode: undefined
      },
      createdBy: undefined
    }

    const result = await ReceiptGenerator.generateReceipt(minimalData)

    expect(result).toBeDefined()
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.buffer.length).toBeGreaterThan(0)
  })

  test('should generate correct filename', () => {
    const filename = ReceiptGenerator.generateFileName('OS-2024-001')
    expect(filename).toMatch(/^Ordem de Servico OS-2024-001\.pdf$/)
  })

  test('should include PDF content markers', async () => {
    const result = await ReceiptGenerator.generateReceipt(mockServiceOrderData)
    
    // Convert buffer to string to check for PDF markers
    const pdfString = result.buffer.toString()
    
    // Check if PDF contains expected content markers
    expect(pdfString).toContain('%PDF') // PDF header
    expect(result.filename).toContain('OS-2024-001')
  })
})