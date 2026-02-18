import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { breaksApi } from '../api/breaks';

export const useBreakStatus = () => {
  return useQuery({
    queryKey: ['breakStatus'],
    queryFn: breaksApi.getStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useTodayBreaks = () => {
  return useQuery({
    queryKey: ['todayBreaks'],
    queryFn: breaksApi.getToday,
  });
};

export const useActiveBreak = () => {
  return useQuery({
    queryKey: ['activeBreak'],
    queryFn: breaksApi.getActive,
  });
};

export const useStartBreak = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: breaksApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakStatus'] });
      queryClient.invalidateQueries({ queryKey: ['activeBreak'] });
      queryClient.invalidateQueries({ queryKey: ['todayBreaks'] });
    },
  });
};

export const useEndBreak = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: breaksApi.end,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakStatus'] });
      queryClient.invalidateQueries({ queryKey: ['activeBreak'] });
      queryClient.invalidateQueries({ queryKey: ['todayBreaks'] });
    },
  });
};

export const useDeleteBreak = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: breaksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayBreaks'] });
      queryClient.invalidateQueries({ queryKey: ['breakStatus'] });
      queryClient.invalidateQueries({ queryKey: ['workDays'] });
      queryClient.invalidateQueries({ queryKey: ['workDayStatus'] });
    },
  });
};
