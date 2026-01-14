import { authOptions } from '../../../lib/auth-options'
import { z } from 'zod'
import { EmailService } from '../../../lib/email-service'
// We cannot use getServerSession here easily because it relies on Next.js headers/cookies context.
// But we can decode the token manually using next-auth/jwt decode.
import { getToken } from 'next-auth/jwt'

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

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const secret = ((context.env as any).NEXTAUTH_SECRET as string) || process.env.NEXTAUTH_SECRET
    const token = await getToken({ 
        req: context.request as any, 
        secret 
    })

    if (!token && process.env.NODE_ENV === 'production') {
      return new Response(JSON.stringify({ ok: false, error: 'nao_autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const json = await context.request.json().catch(() => null)
    if (!json) {
      return new Response(JSON.stringify({ ok: false, error: 'payload_invalido' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const parsed = SendEmailSchema.safeParse(json)
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: 'dados_invalidos', details: parsed.error.issues }), { status: 400, headers: { 'Content-Type': 'application/json' } })
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
      return new Response(JSON.stringify({ ok: false, error: 'anexos_grandes', hint: 'Limite total 10MB' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const result = await EmailService.sendEmail({
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      attachments,
    })

    if (!result.success) {
      // Error handling logic
      const msg = String(result.error || '')
      let code = 502
      let error = 'envio_falhou'
      // ... simplified error mapping
      return new Response(JSON.stringify({ ok: false, error, details: msg }), { status: code, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, previewUrl: result.previewUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    const msg = String(e?.message || 'erro_interno')
    return new Response(JSON.stringify({ ok: false, error: 'erro_interno', details: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
