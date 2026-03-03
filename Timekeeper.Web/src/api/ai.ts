import { fetchApi, fetchApiResponse } from './client'

export interface AiStatus {
  enabled: boolean
}

export interface AiTestResult {
  success: boolean
  message: string
}

export interface AiConfig {
  enabled: boolean
  tokenConfigured: boolean
  globallyConfigured: boolean
}

export interface SaveAiConfigRequest {
  enabled: boolean
  gitHubToken?: string
  clearToken?: boolean
}

export const aiApi = {
  getStatus: () => fetchApi<AiStatus>('/ai/status'),

  getConfig: () => fetchApi<AiConfig>('/ai/config'),

  saveConfig: (req: SaveAiConfigRequest) =>
    fetchApi<AiConfig>('/ai/config', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  testConnection: () => fetchApi<AiTestResult>('/ai/test', { method: 'POST' }),

  /**
   * Returns the raw Response so the caller can read the SSE stream body.
   */
  sendMessage: (message: string) =>
    fetchApiResponse('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  clearSession: () =>
    fetchApiResponse('/ai/session', { method: 'DELETE' }),
}
