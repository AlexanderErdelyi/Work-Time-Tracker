import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timeEntriesApi } from '../api'
import type { TimeEntryDto, StartTimerDto, FilterParams } from '../types'

export const timeEntriesKeys = {
  all: ['timeEntries'] as const,
  lists: () => [...timeEntriesKeys.all, 'list'] as const,
  list: (filters: FilterParams) => [...timeEntriesKeys.lists(), filters] as const,
  details: () => [...timeEntriesKeys.all, 'detail'] as const,
  detail: (id: number) => [...timeEntriesKeys.details(), id] as const,
  running: () => [...timeEntriesKeys.all, 'running'] as const,
  dailyTotals: (filters: FilterParams) => [...timeEntriesKeys.all, 'dailyTotals', filters] as const,
  weeklyTotals: (filters: FilterParams) => [...timeEntriesKeys.all, 'weeklyTotals', filters] as const,
}

export function useTimeEntries(filters?: FilterParams) {
  return useQuery({
    queryKey: timeEntriesKeys.list(filters || {}),
    queryFn: () => timeEntriesApi.getAll(filters),
  })
}

export function useTimeEntry(id: number) {
  return useQuery({
    queryKey: timeEntriesKeys.detail(id),
    queryFn: () => timeEntriesApi.getById(id),
    enabled: !!id,
  })
}

export function useRunningTimer() {
  return useQuery({
    queryKey: timeEntriesKeys.running(),
    queryFn: () => timeEntriesApi.getRunning(),
    refetchInterval: 1000, // Update every second for live timer
  })
}

export function useDailyTotals(filters?: FilterParams) {
  return useQuery({
    queryKey: timeEntriesKeys.dailyTotals(filters || {}),
    queryFn: () => timeEntriesApi.getDailyTotals(filters),
  })
}

export function useWeeklyTotals(filters?: FilterParams) {
  return useQuery({
    queryKey: timeEntriesKeys.weeklyTotals(filters || {}),
    queryFn: () => timeEntriesApi.getWeeklyTotals(filters),
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: TimeEntryDto) => timeEntriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.running() })
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TimeEntryDto }) =>
      timeEntriesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.running() })
    },
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => timeEntriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.lists() })
    },
  })
}

export function useBulkDeleteTimeEntries() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: number[]) => timeEntriesApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.lists() })
    },
  })
}

export function useStartTimer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: StartTimerDto) => timeEntriesApi.start(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.running() })
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.lists() })
    },
  })
}

export function useStopTimer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => timeEntriesApi.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.running() })
      queryClient.invalidateQueries({ queryKey: timeEntriesKeys.lists() })
    },
  })
}
