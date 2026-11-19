// target: 'YYYY-MM-DD'. 오늘(브라우저 기준 날짜)과의 차이를 일 단위로 계산한다.
export function daysUntil(target: string, today = new Date()): number {
  const [y, m, d] = target.split('-').map(Number)
  const targetUtc = Date.UTC(y, m - 1, d)
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((targetUtc - todayUtc) / 86_400_000)
}

export function ddayLabel(target: string, today = new Date()): string {
  const diff = daysUntil(target, today)
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${-diff}`
}

export function todayString(today = new Date()): string {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
