'use client'

import { useEffect } from 'react'

export function DebugLogger() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[DebugLogger] Global Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString()
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[DebugLogger] Unhandled Promise Rejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString()
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    console.log('[DebugLogger] Initialized and listening for errors')

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
