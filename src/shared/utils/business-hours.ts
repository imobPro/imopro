const TIMEZONE = 'America/Sao_Paulo'

export interface BusinessHoursConfig {
  // Dias da semana: 0 = domingo, 1 = segunda, ..., 6 = sábado
  schedule: {
    [dayOfWeek: number]: { start: number; end: number } | null // null = fechado
  }
}

// Horário padrão — sobrescrito por configuração do tenant (Sprint 5)
const DEFAULT_SCHEDULE: BusinessHoursConfig = {
  schedule: {
    0: null,                   // domingo — fechado
    1: { start: 8, end: 18 }, // segunda
    2: { start: 8, end: 18 }, // terça
    3: { start: 8, end: 18 }, // quarta
    4: { start: 8, end: 18 }, // quinta
    5: { start: 8, end: 18 }, // sexta
    6: { start: 8, end: 13 }, // sábado
  },
}

function getNowInSaoPaulo(): { dayOfWeek: number; hour: number; minutes: number } {
  const now = new Date()
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const weekdayMap: Record<string, number> = {
    dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sáb: 6,
  }

  const weekday = formatted.find(p => p.type === 'weekday')?.value?.toLowerCase() ?? ''
  const hour = parseInt(formatted.find(p => p.type === 'hour')?.value ?? '0', 10)
  const minutes = parseInt(formatted.find(p => p.type === 'minute')?.value ?? '0', 10)

  return {
    dayOfWeek: weekdayMap[weekday] ?? 0,
    hour,
    minutes,
  }
}

export function isWithinBusinessHours(config?: BusinessHoursConfig): boolean {
  const schedule = (config ?? DEFAULT_SCHEDULE).schedule
  const { dayOfWeek, hour, minutes } = getNowInSaoPaulo()

  const dayConfig = schedule[dayOfWeek]
  if (!dayConfig) return false

  const currentMinutes = hour * 60 + minutes
  const startMinutes = dayConfig.start * 60
  const endMinutes = dayConfig.end * 60

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export function getNextBusinessDay(config?: BusinessHoursConfig): string {
  const schedule = (config ?? DEFAULT_SCHEDULE).schedule
  const { dayOfWeek } = getNowInSaoPaulo()

  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

  for (let i = 1; i <= 7; i++) {
    const nextDay = (dayOfWeek + i) % 7
    const nextConfig = schedule[nextDay]
    if (nextConfig) {
      const name = dayNames[nextDay]
      return `${name} às ${String(nextConfig.start).padStart(2, '0')}h`
    }
  }

  return 'próximo dia útil' // fallback
}
