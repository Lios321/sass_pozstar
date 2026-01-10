export function captureException(error: unknown, context?: unknown) {
  const payload = { error: String(error instanceof Error ? error.message : error), context }
  if (process.env.NODE_ENV === 'production') {
    console.error('[exception]', payload)
  } else {
    console.warn('[dev-exception]', payload)
  }
}
