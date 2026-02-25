const ISO_OFFSET_SUFFIX = /([zZ]|[+-]\d{2}:\d{2})$/

export function normalizeApiDateTime(value: string): string {
  if (!value) {
    return value
  }

  return ISO_OFFSET_SUFFIX.test(value) ? value : `${value}Z`
}

export function parseApiDateTime(value: string): Date {
  return new Date(normalizeApiDateTime(value))
}
