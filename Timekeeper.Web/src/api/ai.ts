import { fetchApi, fetchApiResponse } from './client'
import { getAiLanguage } from '../lib/aiLanguage'

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

export interface ResolveTaskResult {
  found: boolean
  taskId: number | null
  taskName: string | null
  projectName: string | null
  customerName: string | null
  reasoning: string | null
}

export interface PolishNoteRequest {
  rawNote: string
  taskName?: string
  projectName?: string
  customerName?: string
  language?: string
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

  /** Resolve a natural-language description to the best matching task. */
  resolveTask: (description: string) =>
    fetchApi<ResolveTaskResult>('/ai/resolve-task', {
      method: 'POST',
      body: JSON.stringify({ description }),
    }),

  /** Rewrite a raw note into a professional, customer-ready invoice note. */
  polishNote: (req: PolishNoteRequest) =>
    fetchApi<{ note: string }>('/ai/polish-note', {
      method: 'POST',
      body: JSON.stringify({ ...req, language: req.language ?? getAiLanguage() }),
    }),
}
