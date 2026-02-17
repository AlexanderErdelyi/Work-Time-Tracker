import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, importApi } from '../api'
import type { TaskDto, FilterParams } from '../types'

export const tasksKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksKeys.all, 'list'] as const,
  list: (filters: FilterParams) => [...tasksKeys.lists(), filters] as const,
  details: () => [...tasksKeys.all, 'detail'] as const,
  detail: (id: number) => [...tasksKeys.details(), id] as const,
}

export function useTasks(filters?: FilterParams) {
  return useQuery({
    queryKey: tasksKeys.list(filters || {}),
    queryFn: () => tasksApi.getAll(filters),
  })
}

export function useTask(id: number) {
  return useQuery({
    queryKey: tasksKeys.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: TaskDto) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskDto }) =>
      tasksApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() })
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(variables.id) })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() })
    },
  })
}

export function useImportTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (file: File) => importApi.importTasks(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
