import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickActionsApi, QuickAction } from '../api/quickActions';

export const useQuickActions = () => {
  return useQuery({
    queryKey: ['quickActions'],
    queryFn: quickActionsApi.getAll,
  });
};

export const useQuickAction = (id: number) => {
  return useQuery({
    queryKey: ['quickActions', id],
    queryFn: () => quickActionsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateQuickAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: quickActionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });
};

export const useUpdateQuickAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...action }: Partial<QuickAction> & { id: number }) =>
      quickActionsApi.update(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });
};

export const useDeleteQuickAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: quickActionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });
};

export const useReorderQuickActions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: quickActionsApi.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });
};
