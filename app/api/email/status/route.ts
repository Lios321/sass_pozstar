import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { EmailService } from '@/lib/email-service'

export const runtime = 'edge';

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'nao_autorizado' }, { status: 401 })
  }
  const status = EmailService.getStatus()
  return NextResponse.json({ ok: true, status }, { status: 200 })
}

