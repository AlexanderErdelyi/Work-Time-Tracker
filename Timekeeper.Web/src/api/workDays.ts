import axios from 'axios';

const API_URL = '/api/workdays';

export interface WorkDay {
  id: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  totalWorkedMinutes: number;
  isCheckedIn: boolean;
}

export interface WorkDayStatus {
  isCheckedIn: boolean;
  workDay?: WorkDay;
}

export const workDaysApi = {
  getToday: async () => {
    const response = await axios.get<WorkDay>(`/today`);
    return response.data;
  },

  getStatus: async () => {
    const response = await axios.get<WorkDayStatus>(`/status`);
    return response.data;
  },

  checkIn: async (notes?: string) => {
    const response = await axios.post<WorkDay>(`/checkin`, { notes });
    return response.data;
  },

  checkOut: async (notes?: string) => {
    const response = await axios.post<WorkDay>(`/checkout`, { notes });
    return response.data;
  }
};
