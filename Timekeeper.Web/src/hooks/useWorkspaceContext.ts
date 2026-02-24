import { useQuery } from '@tanstack/react-query'
import { workspacesApi } from '../api'

export const workspaceKeys = {
  all: ['workspace'] as const,
  current: () => [...workspaceKeys.all, 'current'] as const,
}

export function useWorkspaceContext() {
  return useQuery({
    queryKey: workspaceKeys.current(),
    queryFn: () => workspacesApi.getCurrentContext(),
  })
}
