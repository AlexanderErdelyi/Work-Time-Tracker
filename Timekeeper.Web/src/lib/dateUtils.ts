import { format, parseISO, startOfWeek, endOfWeek, addDays, differenceInCalendarDays } from 'date-fns'

export function formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr)
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss')
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'HH:mm:ss')
}

export function formatDateForInput(date: string | Date): string {
  return formatDate(date, "yyyy-MM-dd'T'HH:mm")
}

export function getWeekBounds(date: Date = new Date()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function getWeekdaysInRange(startDate: Date, endDate: Date): number {
  let count = 0
  let current = startDate
  
  while (current <= endDate) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
      count++
    }
    current = addDays(current, 1)
  }
  
  return count
}

export function isToday(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const today = new Date()
  return differenceInCalendarDays(today, dateObj) === 0
}

export function getTodayStart(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

export function getTodayEnd(): string {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return today.toISOString()
}
