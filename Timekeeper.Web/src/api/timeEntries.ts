import { fetchApi, buildQueryString } from './client'
import type { 
  TimeEntry, 
  TimeEntryDto, 
  StartTimerDto, 
  DailyTotal, 
  WeeklyTotal,
  FilterParams 
} from '../types'

export const timeEntriesApi = {
  getAll: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    return fetchApi<TimeEntry[]>(`/timeentries${query}`)
  },

  getById: (id: number) => fetchApi<TimeEntry>(`/timeentries/${id}`),

  getRunning: () => fetchApi<TimeEntry | null>(`/timeentries/running`),

  create: (data: TimeEntryDto) =>
    fetchApi<TimeEntry>('/timeentries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: TimeEntryDto) =>
    fetchApi<TimeEntry>(`/timeentries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/timeentries/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: number[]) =>
    fetchApi<void>('/timeentries/bulk-delete', {
      method: 'POST',
      body: JSON.stringify(ids),
    }),

  start: (data: StartTimerDto) =>
    fetchApi<TimeEntry>('/timeentries/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stop: (id: number) =>
    fetchApi<TimeEntry>(`/timeentries/${id}/stop`, {
      method: 'POST',
    }),

  getDailyTotals: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    return fetchApi<DailyTotal[]>(`/timeentries/daily-totals${query}`)
  },

  getWeeklyTotals: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    return fetchApi<WeeklyTotal[]>(`/timeentries/weekly-totals${query}`)
  },
}
