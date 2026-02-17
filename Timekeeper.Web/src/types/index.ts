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
  position?: number
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
  position?: number
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
  notes?: string
  durationMinutes?: number
  isRunning: boolean
  createdAt: string
  updatedAt?: string
}

export interface TimeEntryDto {
  taskId?: number
  startTime?: string
  endTime?: string
  notes?: string
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
  weekStart: string
  weekEnd: string
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
}
