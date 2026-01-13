import { NextRequest, NextResponse } from 'next/server'
import { ReceiptService } from '@/lib/receipt-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const runtime = 'edge';

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

    // Gerar o comprovante
    const result = await ReceiptService.getReceiptForDownload(serviceOrderId)
    if (!result) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }
    const { buffer: receiptBuffer, filename } = result

    // Evitar caracteres quebrados (mojibake) em alguns navegadores
    const asciiFallback = filename
      .replace(/nº/gi, 'nro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^ -~]/g, '')
    const encodedFilename = encodeURIComponent(filename)

    // Retornar o PDF como resposta
    return new NextResponse(new Uint8Array(receiptBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': receiptBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Erro ao gerar comprovante:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: 'Erro ao gerar comprovante', reason: message },
      { status: 500 }
    )
  }
}