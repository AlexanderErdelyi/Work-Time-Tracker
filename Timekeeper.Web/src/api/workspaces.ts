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
}
