export interface Customer {
  id: number
  no?: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  projects?: Project[]
}

export interface CustomerDto {
  id?: number
  no?: string
  name: string
  description?: string
  isActive?: boolean
}

export interface Project {
  id: number
  no?: string
  name: string
  description?: string
  customerId: number
  customerName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  tasks?: TaskItem[]
}

export interface ProjectDto {
  id?: number
  no?: string
  name: string
  description?: string
  customerId: number
  isActive?: boolean
}

export interface TaskItem {
  id: number
  name: string
  description?: string
  position?: string
  procurementNumber?: string
  projectId: number
  projectName?: string
  customerName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaskDto {
  id?: number
  name: string
  description?: string
  position?: string
  procurementNumber?: string
  projectId: number
  isActive?: boolean
}

export interface TimeEntry {
  id: number
  taskId?: number
  taskName?: string
  taskPosition?: string
  taskProcurementNumber?: string
  projectName?: string
  projectNo?: string
  customerName?: string
  customerNo?: string
  startTime: string
  endTime?: string
  pausedAt?: string
  totalPausedSeconds: number
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Locked'
  submittedAt?: string
  submittedByUserId?: number
  approvedAt?: string
  approvedByUserId?: number
  rejectedAt?: string
  rejectedByUserId?: number
  rejectionReason?: string
  lockedAt?: string
  lockedByUserId?: number
  isPaused: boolean
  notes?: string
  durationMinutes?: number
  billedHours?: number
  isRunning: boolean
  serverNowUtc?: string
  createdAt: string
  updatedAt?: string
}

export interface TimeEntryDto {
  taskId?: number
  startTime?: string
  endTime?: string
  billedHours?: number
  notes?: string
}

export interface RejectTimeEntryDto {
  reason?: string
}

export interface StartTimerDto {
  taskId?: number
  notes?: string
}

export interface DailyTotal {
  date: string
  totalHours: number
  entryCount: number
}

export interface WeeklyTotal {
  date: string
  totalHours: number
  entryCount: number
}

export interface ImportResult {
  customersCreated: number
  customersUpdated: number
  projectsCreated: number
  projectsUpdated: number
  tasksCreated: number
  tasksUpdated: number
  errors: string[]
}

export interface FilterParams {
  startDate?: string
  endDate?: string
  customerId?: number
  projectId?: number
  taskId?: number
  search?: string
  isRunning?: boolean
  isActive?: boolean
  status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Locked'
}

export type UserRole = 'Admin' | 'Manager' | 'Member'

export interface WorkspaceInfo {
  id: number
  name: string
  gitHubIssueOwner?: string
  gitHubIssueRepo?: string
  hasGitHubIssueToken?: boolean
  isActive: boolean
  createdAt: string
}

export interface WorkspaceUser {
  id: number
  displayName: string
  email: string
  role: UserRole
  loginMethod: 'email' | 'github' | 'microsoft' | 'windows' | string
  canResetPassword: boolean
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface CurrentWorkspaceContext {
  workspace: WorkspaceInfo
  currentUser: WorkspaceUser
}

export interface WindowsCredentialsAuthRequest {
  username: string
  password: string
  domain?: string
  displayName?: string
  workspaceId: number
}

export interface AuthResponseDto {
  email: string
  displayName: string
  role: UserRole
  workspaceId: number
  method: 'email' | 'github' | 'microsoft' | 'windows' | 'windowsCredentials' | string
}

export interface CreateSupportIssueRequest {
  title: string
  category: string
  severity: string
  description: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  browser?: string
  operatingSystem?: string
  appVersion?: string
  contactEmail?: string
}

export interface CreateSupportIssueResponse {
  issueNumber: number
  issueUrl: string
  title: string
}

export interface SupportTicketSummary {
  id: number
  issueNumber: number
  issueUrl: string
  title: string
  category: string
  severity: string
  state: string
  hasUnreadUpdates: boolean
  createdAt: string
  lastIssueUpdatedAt?: string
  lastCommentAt?: string
}

export interface SupportTicketComment {
  author: string
  body: string
  createdAt: string
  updatedAt?: string
  url: string
  isResponseFromOthers: boolean
}

export interface SupportTicketDetail {
  ticket: SupportTicketSummary
  comments: SupportTicketComment[]
}

export interface SupportTicketUnreadCount {
  unreadCount: number
}

export interface UploadSupportImageResponse {
  url: string
}
