import { fetchApi } from './client'

export interface SoundFile {
  fileName: string
  displayName: string
  sizeBytes: number
  sizeFormatted: string
  extension: string
}

export const soundsApi = {
  getAll: () => fetchApi<SoundFile[]>('/sounds'),
}
