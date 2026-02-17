import axios from 'axios';

const API_URL = '/api/breaks';

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
    const response = await axios.get<Break>(`${API_URL}/active`);
    return response.data;
  },

  getToday: async () => {
    const response = await axios.get<Break[]>(`${API_URL}/today`);
    return response.data;
  },

  getStatus: async () => {
    const response = await axios.get<BreakStatus>(`${API_URL}/status`);
    return response.data;
  },

  start: async (notes?: string) => {
    const response = await axios.post<Break>(`${API_URL}/start`, { notes });
    return response.data;
  },

  end: async (notes?: string) => {
    const response = await axios.post<Break>(`${API_URL}/end`, { notes });
    return response.data;
  }
};
