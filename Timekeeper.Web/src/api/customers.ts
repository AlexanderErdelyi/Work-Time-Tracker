import { fetchApi, buildQueryString } from './client'
import type { Customer, CustomerDto, FilterParams } from '../types'

export const customersApi = {
  getAll: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    return fetchApi<Customer[]>(`/customers${query}`)
  },

  getById: (id: number) => fetchApi<Customer>(`/customers/${id}`),

  create: (data: CustomerDto) =>
    fetchApi<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: CustomerDto) =>
    fetchApi<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/customers/${id}`, {
      method: 'DELETE',
    }),
}
