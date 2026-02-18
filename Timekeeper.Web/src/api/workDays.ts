import { fetchApi, buildQueryString } from './client';

export interface BreakSummary {
  id: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  isActive: boolean;
  notes?: string;
}

export interface WorkDay {
  id: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  isCheckedIn: boolean;
  breaks: BreakSummary[];
}

export interface WorkDayStatus {
  isCheckedIn: boolean;
  workDay?: WorkDay;
}

export const workDaysApi = {
  getAll: async (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const queryString = buildQueryString(params);
    return fetchApi<WorkDay[]>(`/workdays${queryString}`);
  },

  getToday: async () => {
    return fetchApi<WorkDay>(`/workdays/today`);
  },

  getStatus: async () => {
    return fetchApi<WorkDayStatus>(`/workdays/status`);
  },

  checkIn: async (notes?: string) => {
    return fetchApi<WorkDay>('/workdays/checkin', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  checkOut: async (notes?: string) => {
    return fetchApi<WorkDay>('/workdays/checkout', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  update: async (id: number, data: { checkInTime?: string; checkOutTime?: string; notes?: string }) => {
    return fetchApi<WorkDay>(`/workdays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number, cascade: boolean = false) => {
    const queryString = cascade ? '?cascade=true' : '';
    return fetchApi<void>(`/workdays/${id}${queryString}`, {
      method: 'DELETE',
    });
  }
};
