export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 2
  }).format(value)

/**
 * Parses an ISO string literally into a local Date object, 
 * ignoring any timezone offset suffix (like Z or +00:00).
 */
export const parseLiteralDate = (iso: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso)
  if (!m) return new Date(iso)
  const [, y, mo, d, h, mi] = m
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi)
  )
}

export const formatReservationDateTime = (iso: string): string => {
  const date = parseLiteralDate(iso)
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatLiteralTime = (iso: string): string => {
  const date = parseLiteralDate(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const toInputDateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
