import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { EmailService } from '@/lib/email-service'

const AttachmentSchema = z.object({
  filename: z.string().min(1),
  contentBase64: z.string().min(1),
  contentType: z.string().min(1),
})

const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
})

function base64ToBuffer(b64: string) {
  return Buffer.from(b64, 'base64')
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok: false, error: 'nao_autorizado' }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    if (!json) {
      return NextResponse.json({ ok: false, error: 'payload_invalido' }, { status: 400 })
    }

    const parsed = SendEmailSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'dados_invalidos', details: parsed.error.issues }, { status: 400 })
    }

    const data = parsed.data

    const attachments =
      data.attachments?.map((a) => ({
        filename: a.filename,
        content: base64ToBuffer(a.contentBase64),
        contentType: a.contentType,
      })) || undefined

    const totalSize = attachments?.reduce((acc, a) => acc + a.content.length, 0) || 0
    if (totalSize > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'anexos_grandes', hint: 'Limite total 10MB' }, { status: 400 })
    }

    const result = await EmailService.sendEmail({
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      attachments,
    })

    if (!result.success) {
      const msg = String(result.error || '')
      let code = 502
      let error = 'envio_falhou'
      const m = msg.toLowerCase()
      if (m.includes('invalid login') || m.includes('auth')) {
        code = 400
        error = 'smtp_auth_failed'
      } else if (m.includes('timeout') || m.includes('etimedout')) {
        code = 504
        error = 'timeout'
      } else if (m.includes('econnrefused') || m.includes('enotfound')) {
        code = 502
        error = 'smtp_indisponivel'
      }
      return NextResponse.json({ ok: false, error, details: msg }, { status: code })
    }

    return NextResponse.json({ ok: true, previewUrl: result.previewUrl }, { status: 200 })
  } catch (e: any) {
    const msg = String(e?.message || 'erro_interno')
    let code = 500
    let error = 'erro_interno'
    if (msg.includes('Configurações de email') || msg.includes('Falha na configuração')) {
      code = 500
      error = 'smtp_config_invalida'
    } else if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('invalid login')) {
      code = 401
      error = 'auth_failed'
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      code = 504
      error = 'timeout'
    } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      code = 502
      error = 'smtp_indisponivel'
    }
    return NextResponse.json({ ok: false, error }, { status: code })
  }
}
