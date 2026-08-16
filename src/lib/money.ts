const GROUP_SIZE = 3

function groupInteger(value: string): string {
  const chunks: string[] = []
  for (let end = value.length; end > 0; end -= GROUP_SIZE) {
    chunks.unshift(value.slice(Math.max(0, end - GROUP_SIZE), end))
  }
  return chunks.join(',') || '0'
}

export function formatMoney(
  value: string | number,
  currency = 'LKR'
): string {
  const stringValue = String(value).trim()

  const match = stringValue.match(/^(-?)(\d+)(?:\.(\d+))?$/)

  if (!match) {
    throw new Error(`Invalid decimal money value: ${value}`)
  }

  const [, sign, integer, fraction = '00'] = match

  return `${currency} ${sign}${groupInteger(integer)}.${fraction.padEnd(2, '0')}`
}
