import { NextRequest, NextResponse } from 'next/server'
import { ReceiptService } from '@/lib/receipt-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

<<<<<<< Updated upstream
export const runtime = 'edge'
=======
export const runtime = 'edge';
>>>>>>> Stashed changes

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

    // Gerar o orçamento
    const result = await ReceiptService.getBudgetForDownload(serviceOrderId)
    if (!result) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }
    const { buffer, filename } = result

    // Evitar caracteres quebrados (mojibake) em alguns navegadores
    const asciiFallback = filename
      .replace(/nº/gi, 'nro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^ -~]/g, '')
    const encodedFilename = encodeURIComponent(filename)

    // Retornar o PDF como resposta
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Erro ao gerar orçamento:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    const status = message.includes('Itens de orçamento ausentes') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
