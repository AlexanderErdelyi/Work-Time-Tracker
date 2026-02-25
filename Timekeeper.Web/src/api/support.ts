import { fetchApi } from './client'
import type {
  CreateSupportIssueRequest,
  CreateSupportIssueResponse,
  SupportTicketDetail,
  SupportTicketSummary,
  SupportTicketUnreadCount,
  UploadSupportImageResponse,
} from '../types'

export const supportApi = {
  createIssue: (dto: CreateSupportIssueRequest) =>
    fetchApi<CreateSupportIssueResponse>('/support/issues', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  getMyIssues: () =>
    fetchApi<SupportTicketSummary[]>('/support/issues/my'),

  getIssueDetail: (issueNumber: number) =>
    fetchApi<SupportTicketDetail>(`/support/issues/${issueNumber}`),

  getUnreadCount: () =>
    fetchApi<SupportTicketUnreadCount>('/support/issues/unread-count'),

  markIssueAsRead: (issueNumber: number) =>
    fetchApi<void>(`/support/issues/${issueNumber}/mark-read`, {
      method: 'POST',
    }),

  closeIssue: (issueNumber: number) =>
    fetchApi<void>(`/support/issues/${issueNumber}/close`, {
      method: 'POST',
    }),

  deleteIssue: (issueNumber: number) =>
    fetchApi<void>(`/support/issues/${issueNumber}`, {
      method: 'DELETE',
    }),

  addIssueComment: (issueNumber: number, body: string) =>
    fetchApi<void>(`/support/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return fetchApi<UploadSupportImageResponse>('/support/images', {
      method: 'POST',
      body: formData,
    })
  },
}
