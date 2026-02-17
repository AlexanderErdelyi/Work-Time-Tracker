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
  getAll: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    const response = await axios.get<WorkDay[]>(`${API_URL}${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  getToday: async () => {
    const response = await axios.get<WorkDay>(`${API_URL}/today`);
    return response.data;
  },

  getStatus: async () => {
    const response = await axios.get<WorkDayStatus>(`${API_URL}/status`);
    return response.data;
  },

  checkIn: async (notes?: string) => {
    const response = await axios.post<WorkDay>(`${API_URL}/checkin`, { notes });
    return response.data;
  },

  checkOut: async (notes?: string) => {
    const response = await axios.post<WorkDay>(`${API_URL}/checkout`, { notes });
    return response.data;
  },

  update: async (id: number, data: { checkInTime?: string; checkOutTime?: string; notes?: string }) => {
    const response = await axios.put<WorkDay>(`${API_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await axios.delete(`${API_URL}/${id}`);
  }
};
