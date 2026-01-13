import { NextRequest, NextResponse } from 'next/server'
import { ReceiptService, ReceiptDeliveryMethod } from '@/lib/receipt-service'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const runtime = 'edge';

const resendSchema = z.object({
  method: z.enum(['EMAIL', 'WHATSAPP', 'BOTH']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação via NextAuth (JWT session)
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Validar dados da requisição
    const body = await request.json()
    const { method } = resendSchema.parse(body)

    const { id } = await params
    const serviceOrderId = id

    // Determinar métodos de envio
    const methods: ReceiptDeliveryMethod[] = []
    
    if (method === 'EMAIL' || method === 'BOTH') {
      methods.push(ReceiptDeliveryMethod.EMAIL)
    }
    
    if (method === 'WHATSAPP' || method === 'BOTH') {
      methods.push(ReceiptDeliveryMethod.WHATSAPP)
    }

    // Reenviar por cada método
    const results = await Promise.all(
      methods.map(async (deliveryMethod) => {
        const success = await ReceiptService.resendReceipt(serviceOrderId, deliveryMethod)
        return {
          method: deliveryMethod,
          success,
        }
      })
    )

    // Verificar se pelo menos um envio foi bem-sucedido
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    return NextResponse.json({
      message: successCount > 0 
        ? `Comprovante reenviado com sucesso (${successCount}/${totalCount})`
        : 'Falha ao reenviar comprovante',
      results,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao reenviar comprovante:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}