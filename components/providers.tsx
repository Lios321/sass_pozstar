"use client"

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: 'ui-toast',
          style: {
            background: 'hsl(var(--accent))',
            border: '1px solid hsl(var(--border))',
          },
          classNames: {
            success: 'ui-toast',
            error: 'ui-toast',
            warning: 'ui-toast',
            info: 'ui-toast',
          },
        }}
      />
    </SessionProvider>
  )
}
