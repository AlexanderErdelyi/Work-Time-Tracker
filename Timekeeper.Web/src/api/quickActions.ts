import axios from 'axios';

const API_URL = '/api/quickactions';

export interface QuickAction {
  id: number;
  name: string;
  icon?: string;
  actionType: 'StartTimer' | 'StartTimerWithTask' | 'CheckIn' | 'StartBreak' | 'ExportToday';
  taskId?: number;
  sortOrder: number;
  task?: {
    id: number;
    name: string;
    projectName: string;
    customerName: string;
  };
}

export const quickActionsApi = {
  getAll: async () => {
    const response = await axios.get<QuickAction[]>(API_URL);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await axios.get<QuickAction>(`${API_URL}/${id}`);
    return response.data;
  },

  create: async (action: Omit<QuickAction, 'id'>) => {
    const response = await axios.post<QuickAction>(API_URL, action);
    return response.data;
  },

  update: async (id: number, action: Partial<QuickAction>) => {
    await axios.put(`${API_URL}/${id}`, action);
  },

  delete: async (id: number) => {
    await axios.delete(`${API_URL}/${id}`);
  },

  reorder: async (ids: number[]) => {
    await axios.post(`${API_URL}/reorder`, ids);
  }
};
