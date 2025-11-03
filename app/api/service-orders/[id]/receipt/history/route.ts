import { NextRequest, NextResponse } from 'next/server'
import { ReceiptService } from '@/lib/receipt-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação via NextAuth (JWT session)
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const serviceOrderId = id

    // Buscar histórico de entregas
    const history = await ReceiptService.getDeliveryHistory(serviceOrderId)

    return NextResponse.json({
      serviceOrderId,
      deliveries: history,
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de entregas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}