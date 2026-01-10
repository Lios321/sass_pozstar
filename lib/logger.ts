type Level = 'debug' | 'info' | 'warn' | 'error'

const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const defaultLevel: Level = (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
const envLevel = (process.env.LOG_LEVEL as Level) || defaultLevel

function log(level: Level, ...args: unknown[]) {
  if (order[level] >= order[envLevel]) {
    const ts = new Date().toISOString()
    const prefix = `[${ts}] [${level}]`
    if (level === 'error') {
      console.error(prefix, ...args)
    } else if (level === 'warn') {
      console.warn(prefix, ...args)
    } else if (level === 'info') {
      console.info(prefix, ...args)
    } else {
      console.log(prefix, ...args)
    }
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
}
