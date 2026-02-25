import { fetchApi, fetchApiResponse, buildQueryString } from './client'
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

    const response = await fetchApiResponse('/import/tasks', {
      method: 'POST',
      body: formData,
    })

    return response.json() as Promise<ImportResult>
  },

  downloadTemplate: async () => {
    const response = await fetchApiResponse('/import/tasks/template')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'task-import-template.xlsx'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  },
}
