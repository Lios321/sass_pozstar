export const defaultLocale = 'pt-BR'

export function formatDate(date: Date | string, locale = defaultLocale) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale)
}

export function formatCurrency(value: number, currency = 'BRL', locale = defaultLocale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}
