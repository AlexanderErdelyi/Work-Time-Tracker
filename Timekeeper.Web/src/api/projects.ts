import { fetchApi, buildQueryString } from './client'
import type { Project, ProjectDto, FilterParams } from '../types'

export const projectsApi = {
  getAll: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    return fetchApi<Project[]>(`/projects${query}`)
  },

  getById: (id: number) => fetchApi<Project>(`/projects/${id}`),

  create: (data: ProjectDto) =>
    fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: ProjectDto) =>
    fetchApi<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/projects/${id}`, {
      method: 'DELETE',
    }),
}
