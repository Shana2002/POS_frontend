export const APP_TIME_ZONE = 'Asia/Colombo'

export function formatDate(dateOnly: string): string {
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new Error(`Invalid date value: ${dateOnly}`)
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function formatDateTime(utcValue: string): string {
  const date = new Date(utcValue)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid datetime value: ${utcValue}`)
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: APP_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
