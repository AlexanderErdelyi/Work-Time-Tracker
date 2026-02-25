import { fetchApi } from './client'
import type {
  CurrentWorkspaceContext,
  WorkspaceUser,
  UserRole,
} from '../types'

interface CreateWorkspaceUserDto {
  displayName: string
  email: string
  role: UserRole
}

interface UpdateWorkspaceUserRoleDto {
  role: UserRole
}

interface UpdateWorkspaceUserStatusDto {
  isActive: boolean
}

interface UpdateWorkspaceUserPasswordDto {
  newPassword: string
}

interface UpdateWorkspaceSupportRepositoryDto {
  gitHubIssueOwner?: string
  gitHubIssueRepo?: string
  gitHubIssueToken?: string
  clearGitHubIssueToken?: boolean
}

interface TestWorkspaceSupportRepositoryDto {
  gitHubIssueOwner?: string
  gitHubIssueRepo?: string
  gitHubIssueToken?: string
}

interface TestWorkspaceSupportRepositoryResultDto {
  success: boolean
  message: string
}

export const workspacesApi = {
  getCurrentContext: () => fetchApi<CurrentWorkspaceContext>('/workspaces/current'),
  getCurrentUsers: () => fetchApi<WorkspaceUser[]>('/workspaces/current/users'),
  createUser: (dto: CreateWorkspaceUserDto) =>
    fetchApi<WorkspaceUser>('/workspaces/current/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateUserRole: (id: number, dto: UpdateWorkspaceUserRoleDto) =>
    fetchApi<WorkspaceUser>(`/workspaces/current/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  updateUserStatus: (id: number, dto: UpdateWorkspaceUserStatusDto) =>
    fetchApi<WorkspaceUser>(`/workspaces/current/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  resetUserPassword: (id: number, dto: UpdateWorkspaceUserPasswordDto) =>
    fetchApi<WorkspaceUser>(`/workspaces/current/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  deleteUser: (id: number) =>
    fetchApi<void>(`/workspaces/current/users/${id}`, {
      method: 'DELETE',
    }),
  updateCurrentSupportRepository: (dto: UpdateWorkspaceSupportRepositoryDto) =>
    fetchApi<CurrentWorkspaceContext['workspace']>('/workspaces/current/support-repository', {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  testCurrentSupportRepository: (dto: TestWorkspaceSupportRepositoryDto) =>
    fetchApi<TestWorkspaceSupportRepositoryResultDto>('/workspaces/current/support-repository/test', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
}
