import { fetchApi } from './client';

export interface Break {
  id: number;
  startTime: string;
  endTime?: string;
  notes?: string;
  workDayId?: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface BreakStatus {
  isOnBreak: boolean;
  activeBreak?: Break;
}

export const breaksApi = {
  getActive: async () => {
    return fetchApi<Break>('/breaks/active');
  },

  getToday: async () => {
    return fetchApi<Break[]>('/breaks/today');
  },

  getStatus: async () => {
    return fetchApi<BreakStatus>('/breaks/status');
  },

  start: async (notes?: string) => {
    return fetchApi<Break>('/breaks/start', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  end: async (notes?: string) => {
    return fetchApi<Break>('/breaks/end', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  delete: async (id: number) => {
    return fetchApi<void>(`/breaks/${id}`, {
      method: 'DELETE',
    });
  }
};
