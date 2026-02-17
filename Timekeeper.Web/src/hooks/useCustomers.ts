import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '../api'
import type { CustomerDto, FilterParams } from '../types'

export const customersKeys = {
  all: ['customers'] as const,
  lists: () => [...customersKeys.all, 'list'] as const,
  list: (filters: FilterParams) => [...customersKeys.lists(), filters] as const,
  details: () => [...customersKeys.all, 'detail'] as const,
  detail: (id: number) => [...customersKeys.details(), id] as const,
}

export function useCustomers(filters?: FilterParams) {
  return useQuery({
    queryKey: customersKeys.list(filters || {}),
    queryFn: () => customersApi.getAll(filters),
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: customersKeys.detail(id),
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CustomerDto) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerDto }) =>
      customersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customersKeys.detail(variables.id) })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() })
    },
  })
}
