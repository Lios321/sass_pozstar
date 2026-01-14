import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const runtime = 'edge';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user || null,
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}

