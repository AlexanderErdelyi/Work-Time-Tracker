import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workDaysApi } from '../api/workDays';

export const useWorkDayStatus = () => {
  return useQuery({
    queryKey: ['workDayStatus'],
    queryFn: workDaysApi.getStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useTodayWorkDay = () => {
  return useQuery({
    queryKey: ['todayWorkDay'],
    queryFn: workDaysApi.getToday,
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workDaysApi.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDayStatus'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkDay'] });
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workDaysApi.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDayStatus'] });
      queryClient.invalidateQueries({ queryKey: ['todayWorkDay'] });
    },
  });
};
