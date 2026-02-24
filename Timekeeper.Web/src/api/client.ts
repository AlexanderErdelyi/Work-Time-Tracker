const API_BASE_URL = '/api'

function getDevelopmentIdentityHeaders(): Record<string, string> {
  const configuredEmail = localStorage.getItem('timekeeper_authUserEmail')?.trim()
    || localStorage.getItem('timekeeper_userEmail')?.trim()
    || 'admin@local.timekeeper'

  const configuredWorkspace = localStorage.getItem('timekeeper_authWorkspaceId')?.trim() || '1'
  const workspaceId = Number.isFinite(Number(configuredWorkspace)) && Number(configuredWorkspace) > 0
    ? configuredWorkspace
    : '1'

  const configuredRole = localStorage.getItem('timekeeper_authRole')?.trim()

  const headers: Record<string, string> = {
    'X-Timekeeper-User': configuredEmail,
    'X-Timekeeper-Workspace': workspaceId,
  }

  if (configuredRole) {
    headers['X-Timekeeper-Role'] = configuredRole
  }

  return headers
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getDevelopmentIdentityHeaders(),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `HTTP error! status: ${response.status}`)
  }

  // Handle no content responses
  if (response.status === 204) {
    return null as T
  }

  return response.json()
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}
