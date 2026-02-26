import { buildQueryString, fetchApiResponse } from './client'
import type { FilterParams } from '../types'

async function downloadFile(endpoint: string, fallbackFileName: string) {
  const response = await fetchApiResponse(endpoint)
  const disposition = response.headers.get('content-disposition') ?? ''
  const fileNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
  const serverFileName = fileNameMatch?.[1] ?? fileNameMatch?.[2]
  const fileName = serverFileName ? decodeURIComponent(serverFileName) : fallbackFileName

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

export const exportApi = {
  exportCsv: async (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    await downloadFile(`/export/csv${query}`, 'timekeeper-export.csv')
  },

  exportExcel: async (params?: FilterParams) => {
    const query = params ? buildQueryString(params) : ''
    await downloadFile(`/export/xlsx${query}`, 'timekeeper-export.xlsx')
  },

  exportTodayExcel: async () => {
    const today = new Date().toISOString().split('T')[0]
    await downloadFile(`/export/today/xlsx`, `timekeeper-today-${today}.xlsx`)
  },
}
