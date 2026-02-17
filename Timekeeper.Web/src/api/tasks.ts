import { fetchApi, buildQueryString } from './client'
import type { TaskItem, TaskDto, FilterParams, ImportResult } from '../types'

export const tasksApi = {
  getAll: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    return fetchApi<TaskItem[]>(`/tasks${query}`)
  },

  getById: (id: number) => fetchApi<TaskItem>(`/tasks/${id}`),

  create: (data: TaskDto) =>
    fetchApi<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: TaskDto) =>
    fetchApi<TaskItem>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
}

export const importApi = {
  importTasks: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/import/tasks', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }
    
    return response.json() as Promise<ImportResult>
  },

  downloadTemplate: () => {
    window.open('/api/import/tasks/template', '_blank')
  },
}
