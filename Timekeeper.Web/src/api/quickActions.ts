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
    const response = await axios.get<QuickAction>(`/`);
    return response.data;
  },

  create: async (action: Omit<QuickAction, 'id'>) => {
    const response = await axios.post<QuickAction>(API_URL, action);
    return response.data;
  },

  update: async (id: number, action: Partial<QuickAction>) => {
    await axios.put(`/`, { ...action, id });
  },

  delete: async (id: number) => {
    await axios.delete(`/`);
  },

  reorder: async (ids: number[]) => {
    await axios.post(`/reorder`, ids);
  }
};
