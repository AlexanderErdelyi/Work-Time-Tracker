export function parseDuration(duration: string): number {
  if (!duration) return 0
  
  const parts = duration.split(':')
  if (parts.length !== 3) return 0
  
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const seconds = parseInt(parts[2], 10) || 0
  
  return hours * 3600 + minutes * 60 + seconds
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function formatDurationHours(duration: string): string {
  const seconds = parseDuration(duration)
  const hours = (seconds / 3600).toFixed(2)
  return `${hours}h`
}

export function calculateDuration(startTime: string, endTime?: string): string {
  // Ensure we're working with UTC times to avoid timezone issues
  // Normalize to UTC by appending Z if missing
  const normalizeUTC = (time: string) => 
    time && !time.endsWith('Z') ? time + 'Z' : time
  
  const start = new Date(normalizeUTC(startTime))
  const end = endTime ? new Date(normalizeUTC(endTime)) : new Date()
  
  // Calculate difference in milliseconds
  const diffMs = end.getTime() - start.getTime()
  
  // Ensure non-negative duration (in case of clock skew)
  const seconds = Math.max(0, Math.floor(diffMs / 1000))
  
  return formatDuration(seconds)
}

export function roundDuration(
  duration: string,
  billingIncrement: number,
  threshold: number
): string {
  const seconds = parseDuration(duration)
  const minutes = seconds / 60
  
  // If below threshold, round down to 0
  if (minutes < threshold) {
    return '00:00:00'
  }
  
  // If less than 15 minutes but above threshold, always round up to 15 minutes (0.25h)
  if (minutes < 15) {
    return '00:15:00'
  }
  
  // Round to nearest billing increment
  const roundedMinutes = Math.ceil(minutes / billingIncrement) * billingIncrement
  const roundedSeconds = roundedMinutes * 60
  
  return formatDuration(roundedSeconds)
}

export function parseDurationToMinutes(duration: string): number {
  const seconds = parseDuration(duration)
  return Math.round(seconds / 60)
}

export function minutesToDuration(minutes: number): string {
  const seconds = minutes * 60
  return formatDuration(seconds)
}
