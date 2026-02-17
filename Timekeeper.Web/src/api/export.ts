import { buildQueryString } from './client'
import type { FilterParams } from '../types'

export const exportApi = {
  exportCsv: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    window.open(`/api/export/csv${query}`, '_blank')
  },

  exportExcel: (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    window.open(`/api/export/xlsx${query}`, '_blank')
  },
}
