import { fetchApi } from './client'
import type { CurrentWorkspaceContext } from '../types'

export const workspacesApi = {
  getCurrentContext: () => fetchApi<CurrentWorkspaceContext>('/workspaces/current'),
}
