import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    redirect('/dashboard')
  }
  redirect('/login')
}
