import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import SoundSelectionModal from '../components/SoundSelectionModal'
import { useTasks } from '../hooks/useTasks'
import { usePWA } from '../hooks/usePWA'
import { useWorkspaceContext } from '../hooks/useWorkspaceContext'
import { SystemIdleDetectionService } from '../services/systemIdleDetection'
import { activityDetectionService } from '../services/activityDetection'
import { workspacesApi } from '../api'
import type { UserRole } from '../types'
import { 
  User,
  Clock, 
  Palette, 
  Bell, 
  Download, 
  Database,
  Save,
  RefreshCw,
  Volume2,
  Activity,
  Zap,
  X,
  Monitor,
  Check,
  AlertCircle,
  Smartphone,
} from 'lucide-react'

export function Settings() {
  const queryClient = useQueryClient()
  const { data: workspaceContext } = useWorkspaceContext()
  const isAdminUser = workspaceContext?.currentUser.role === 'Admin'

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>('Member')

  const { data: workspaceUsers = [] } = useQuery({
    queryKey: ['workspace-users'],
    queryFn: () => workspacesApi.getCurrentUsers(),
    enabled: isAdminUser,
  })

  const createUserMutation = useMutation({
    mutationFn: () =>
      workspacesApi.createUser({
        displayName: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
      }),
    onSuccess: () => {
      setNewUserName('')
      setNewUserEmail('')
      setNewUserRole('Member')
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
      alert('User created.')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not create user.'
      alert(message)
    },
  })

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      workspacesApi.updateUserRole(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not update role.'
      alert(message)
    },
  })

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      workspacesApi.updateUserStatus(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not update status.'
      alert(message)
    },
  })

  // User Settings
  const [userName, setUserName] = useState(localStorage.getItem('timekeeper_userName') || '')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('timekeeper_userEmail') || '')
  const [authUserEmail, setAuthUserEmail] = useState(localStorage.getItem('timekeeper_authUserEmail') || '')
  const [authRole, setAuthRole] = useState(localStorage.getItem('timekeeper_authRole') || 'Member')
  const [authWorkspaceId, setAuthWorkspaceId] = useState(localStorage.getItem('timekeeper_authWorkspaceId') || '1')

  // Time Tracking Settings
  const [defaultBreakDuration, setDefaultBreakDuration] = useState(
    localStorage.getItem('timekeeper_breakDuration') || '30'
  )
  const [weeklyHoursTarget, setWeeklyHoursTarget] = useState(
    localStorage.getItem('timekeeper_weeklyTarget') || '40'
  )
  const [dailyHoursTarget, setDailyHoursTarget] = useState(
    localStorage.getItem('timekeeper_dailyTarget') || '8'
  )

  // Billing Settings
  const [enableBilling, setEnableBilling] = useState(
    localStorage.getItem('timekeeper_enableBilling') === 'true'
  )
  const [roundingThreshold, setRoundingThreshold] = useState(
    localStorage.getItem('timekeeper_roundingThreshold') || '3'
  )
  const [billingIncrement, setBillingIncrement] = useState(
    localStorage.getItem('timekeeper_billingIncrement') || '0.25'
  )
  const [recentEntriesCount, setRecentEntriesCount] = useState(
    localStorage.getItem('timekeeper_recentEntriesCount') || '20'
  )

  // Display Settings
  const [dateFormat, setDateFormat] = useState(
    localStorage.getItem('timekeeper_dateFormat') || 'MMM d, yyyy'
  )
  const [timeFormat, setTimeFormat] = useState(
    localStorage.getItem('timekeeper_timeFormat') || '24h'
  )
  const [entriesPerPage, setEntriesPerPage] = useState(
    localStorage.getItem('timekeeper_entriesPerPage') || '20'
  )

  // Notification Settings
  const [enableNotifications, setEnableNotifications] = useState(
    localStorage.getItem('timekeeper_enableNotifications') === 'true'
  )
  const [reminderInterval, setReminderInterval] = useState(
    localStorage.getItem('timekeeper_reminderInterval') || '60'
  )
  const [breakReminderEnabled, setBreakReminderEnabled] = useState(
    localStorage.getItem('timekeeper_breakReminderEnabled') === 'true'
  )
  const [breakReminderInterval, setBreakReminderInterval] = useState(
    localStorage.getItem('timekeeper_breakReminderInterval') || '120'
  )
  const [dailyGoalNotification, setDailyGoalNotification] = useState(
    localStorage.getItem('timekeeper_dailyGoalNotification') === 'true'
  )
  const [continuousWorkAlert, setContinuousWorkAlert] = useState(
    localStorage.getItem('timekeeper_continuousWorkAlert') === 'true'
  )
  const [continuousWorkDuration, setContinuousWorkDuration] = useState(
    localStorage.getItem('timekeeper_continuousWorkDuration') || '240'
  )
  const [notificationSound, setNotificationSound] = useState(
    localStorage.getItem('timekeeper_notificationSound') || 'default'
  )
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false)

  // Idle Detection Settings
  const [enableIdleDetection, setEnableIdleDetection] = useState(
    localStorage.getItem('timekeeper_enableIdleDetection') === 'true'
  )
  const [idleThresholdMinutes, setIdleThresholdMinutes] = useState(
    localStorage.getItem('timekeeper_idleThresholdMinutes') || '5'
  )
  const [autoResumeOnActivity, setAutoResumeOnActivity] = useState(
    localStorage.getItem('timekeeper_autoResumeOnActivity') === 'true'
  )

  // System Idle Detection State
  const [systemIdleSupported, setSystemIdleSupported] = useState(false)
  const [systemIdlePermission, setSystemIdlePermission] = useState<PermissionState>('prompt')
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [detectionMethod, setDetectionMethod] = useState<'system-level' | 'browser-only' | 'none'>('none')

  // PWA Installation State
  const { isSupported: pwaSupported, isInstalled: pwaInstalled, isInstalling: pwaInstalling, canInstall: pwaCanInstall, installPWA } = usePWA()

  // Check system idle detection availability on mount
  useEffect(() => {
    const checkSystemIdleAvailability = async () => {
      const supported = SystemIdleDetectionService.isSupported()
      setSystemIdleSupported(supported)

      if (supported) {
        const permission = await SystemIdleDetectionService.checkPermission()
        setSystemIdlePermission(permission)
      }

      // Get current detection method
      const method = activityDetectionService.getDetectionMethod()
      setDetectionMethod(method)
    }

    checkSystemIdleAvailability()
  }, [])

  // Quick Tasks Settings
  const [quickTaskIds, setQuickTaskIds] = useState<number[]>(
    JSON.parse(localStorage.getItem('timekeeper_quickTasks') || '[]')
  )
  const { data: allTasks = [] } = useTasks({ isActive: true })
  const [selectedTaskForQuick, setSelectedTaskForQuick] = useState<string>('')

  const handleSaveUserSettings = () => {
    localStorage.setItem('timekeeper_userName', userName)
    localStorage.setItem('timekeeper_userEmail', userEmail)
    alert('User settings saved!')
  }

  const handleSaveDevelopmentIdentity = () => {
    const normalizedEmail = authUserEmail.trim() || userEmail.trim() || 'admin@local.timekeeper'
    const parsedWorkspaceId = parseInt(authWorkspaceId, 10)
    const normalizedWorkspaceId = Number.isFinite(parsedWorkspaceId) && parsedWorkspaceId > 0
      ? String(parsedWorkspaceId)
      : '1'

    localStorage.setItem('timekeeper_authUserEmail', normalizedEmail)
    localStorage.setItem('timekeeper_authRole', authRole)
    localStorage.setItem('timekeeper_authWorkspaceId', normalizedWorkspaceId)

    setAuthUserEmail(normalizedEmail)
    setAuthWorkspaceId(normalizedWorkspaceId)

    alert('Development identity saved! Refresh pages to apply across open tabs.')
  }

  const handleSaveTrackingSettings = () => {
    localStorage.setItem('timekeeper_breakDuration', defaultBreakDuration)
    localStorage.setItem('timekeeper_weeklyTarget', weeklyHoursTarget)
    localStorage.setItem('timekeeper_dailyTarget', dailyHoursTarget)
    alert('Time tracking settings saved!')
  }

  const handleSaveBillingSettings = () => {
    localStorage.setItem('timekeeper_enableBilling', enableBilling.toString())
    localStorage.setItem('timekeeper_roundingThreshold', roundingThreshold)
    localStorage.setItem('timekeeper_billingIncrement', billingIncrement)
    localStorage.setItem('timekeeper_recentEntriesCount', recentEntriesCount)
    alert('Billing settings saved! Refresh the page to see changes.')
  }

  const handleSaveDisplaySettings = () => {
    localStorage.setItem('timekeeper_dateFormat', dateFormat)
    localStorage.setItem('timekeeper_timeFormat', timeFormat)
    localStorage.setItem('timekeeper_entriesPerPage', entriesPerPage)
    alert('Display settings saved! Refresh the page to see changes.')
  }

  const handleSaveNotificationSettings = () => {
    localStorage.setItem('timekeeper_enableNotifications', enableNotifications.toString())
    localStorage.setItem('timekeeper_reminderInterval', reminderInterval)
    localStorage.setItem('timekeeper_breakReminderEnabled', breakReminderEnabled.toString())
    localStorage.setItem('timekeeper_breakReminderInterval', breakReminderInterval)
    localStorage.setItem('timekeeper_dailyGoalNotification', dailyGoalNotification.toString())
    localStorage.setItem('timekeeper_continuousWorkAlert', continuousWorkAlert.toString())
    localStorage.setItem('timekeeper_continuousWorkDuration', continuousWorkDuration)
    localStorage.setItem('timekeeper_notificationSound', notificationSound)
    
    // Request notification permission if enabling
    if (enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    alert('Notification settings saved!')
  }

  const handleSoundSelect = (soundFileName: string) => {
    setNotificationSound(soundFileName);
    localStorage.setItem('timekeeper_notificationSound', soundFileName);
  }

  const handleSaveIdleDetectionSettings = () => {
    localStorage.setItem('timekeeper_enableIdleDetection', enableIdleDetection.toString())
    localStorage.setItem('timekeeper_idleThresholdMinutes', idleThresholdMinutes)
    localStorage.setItem('timekeeper_autoResumeOnActivity', autoResumeOnActivity.toString())
    alert('Idle detection settings saved! Refresh the page to apply changes.')
  }

  const handleRequestSystemIdlePermission = async () => {
    setIsRequestingPermission(true)
    try {
      const granted = await SystemIdleDetectionService.requestPermission()
      
      if (granted) {
        setSystemIdlePermission('granted')
        alert('✅ System idle detection enabled!\n\nThe app can now detect activity across all applications and monitors.\n\nRestarting detection...')
        
        // Restart detection to use system-level method
        await activityDetectionService.restart()
        
        // Update detection method
        const method = activityDetectionService.getDetectionMethod()
        setDetectionMethod(method)
      } else {
        setSystemIdlePermission('denied')
        alert('⚠️ Permission denied.\n\nFalling back to browser-only detection.\nThis only tracks activity within the browser tab.')
      }
    } catch (error) {
      console.error('Error requesting system idle permission:', error)
      alert('❌ Error requesting permission. Please try again.')
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const handleAddQuickTask = () => {
    if (!selectedTaskForQuick) return
    const taskId = parseInt(selectedTaskForQuick)
    if (!quickTaskIds.includes(taskId)) {
      const newQuickTaskIds = [...quickTaskIds, taskId]
      setQuickTaskIds(newQuickTaskIds)
      localStorage.setItem('timekeeper_quickTasks', JSON.stringify(newQuickTaskIds))
      setSelectedTaskForQuick('')
    }
  }

  const handleRemoveQuickTask = (taskId: number) => {
    const newQuickTaskIds = quickTaskIds.filter(id => id !== taskId)
    setQuickTaskIds(newQuickTaskIds)
    localStorage.setItem('timekeeper_quickTasks', JSON.stringify(newQuickTaskIds))
  }
  const handleExportData = async () => {
    try {
      const response = await fetch('/api/export/csv')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timekeeper-backup-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const handleClearLocalSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      const keysToRemove = [
        'timekeeper_userName',
        'timekeeper_userEmail',
        'timekeeper_breakDuration',
        'timekeeper_weeklyTarget',
        'timekeeper_dailyTarget',
        'timekeeper_dateFormat',
        'timekeeper_timeFormat',
        'timekeeper_entriesPerPage',
        'timekeeper_notifications',
        'timekeeper_reminderInterval',
        'timekeeper_darkMode',
      ]
      keysToRemove.forEach(key => localStorage.removeItem(key))
      alert('Settings reset! Refresh the page to see defaults.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Timekeeper preferences
        </p>
      </div>

      {/* User Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>User Profile</CardTitle>
          </div>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          <Button onClick={handleSaveUserSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save User Settings
          </Button>
        </CardContent>
      </Card>

      {isAdminUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Workspace Users</CardTitle>
            </div>
            <CardDescription>
              Admin area for creating users and managing roles/status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Display Name</Label>
                <Input
                  id="newUserName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Colleague Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email</Label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="colleague@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserRole">Role</Label>
                <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                  <SelectTrigger id="newUserRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => {
                if (!newUserName.trim() || !newUserEmail.trim()) {
                  alert('Display name and email are required.')
                  return
                }
                createUserMutation.mutate()
              }}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>

            <div className="space-y-3">
              {workspaceUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found in current workspace.</p>
              ) : (
                workspaceUsers.map((workspaceUser) => (
                  <div key={workspaceUser.id} className="flex flex-wrap items-center gap-3 border rounded-md p-3">
                    <div className="min-w-[220px] flex-1">
                      <p className="font-medium text-sm">{workspaceUser.displayName}</p>
                      <p className="text-xs text-muted-foreground">{workspaceUser.email}</p>
                    </div>
                    <Select
                      value={workspaceUser.role}
                      onValueChange={(value) =>
                        updateUserRoleMutation.mutate({ id: workspaceUser.id, role: value as UserRole })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateUserStatusMutation.mutate({
                          id: workspaceUser.id,
                          isActive: !workspaceUser.isActive,
                        })
                      }
                    >
                      {workspaceUser.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <CardTitle>Development Identity</CardTitle>
          </div>
          <CardDescription>
            Used for multi-user development testing via request headers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="authUserEmail">Auth Email</Label>
              <Input
                id="authUserEmail"
                type="email"
                value={authUserEmail}
                onChange={(e) => setAuthUserEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authRole">Role</Label>
              <Select value={authRole} onValueChange={setAuthRole}>
                <SelectTrigger id="authRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="authWorkspaceId">Workspace ID</Label>
              <Input
                id="authWorkspaceId"
                type="number"
                min="1"
                value={authWorkspaceId}
                onChange={(e) => setAuthWorkspaceId(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveDevelopmentIdentity} className="gap-2">
              <Save className="h-4 w-4" />
              Save Development Identity
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!userEmail.trim()) {
                  alert('Set a User Profile email first.')
                  return
                }
                setAuthUserEmail(userEmail.trim())
              }}
            >
              Use Profile Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Time Tracking</CardTitle>
          </div>
          <CardDescription>Configure time tracking behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breakDuration">Default Break (minutes)</Label>
              <Input
                id="breakDuration"
                type="number"
                value={defaultBreakDuration}
                onChange={(e) => setDefaultBreakDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyTarget">Daily Hours Target</Label>
              <Input
                id="dailyTarget"
                type="number"
                value={dailyHoursTarget}
                onChange={(e) => setDailyHoursTarget(e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeklyTarget">Weekly Hours Target</Label>
              <Input
                id="weeklyTarget"
                type="number"
                value={weeklyHoursTarget}
                onChange={(e) => setWeeklyHoursTarget(e.target.value)}
                placeholder="40"
              />
            </div>
          </div>
          <Button onClick={handleSaveTrackingSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save Tracking Settings
          </Button>
        </CardContent>
      </Card>

      {/* Quick Tasks Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <CardTitle>Quick Tasks</CardTitle>
          </div>
          <CardDescription>Configure tasks for one-click timer start from Quick Actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="quickTaskSelect">Add Task to Quick Actions</Label>
                <Select
                  value={selectedTaskForQuick}
                  onValueChange={setSelectedTaskForQuick}
                >
                  <SelectTrigger id="quickTaskSelect">
                    <SelectValue placeholder="Select a task..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allTasks
                      .filter(task => !quickTaskIds.includes(task.id))
                      .map(task => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.name} ({task.customerName} / {task.projectName})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddQuickTask}
                disabled={!selectedTaskForQuick}
                className="mt-6"
              >
                Add
              </Button>
            </div>

            {quickTaskIds.length > 0 && (
              <div className="space-y-2">
                <Label>Quick Tasks ({quickTaskIds.length})</Label>
                <div className="space-y-2">
                  {quickTaskIds.map(taskId => {
                    const task = allTasks.find(t => t.id === taskId)
                    if (!task) return null
                    return (
                      <div
                        key={taskId}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{task.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {task.customerName} / {task.projectName}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuickTask(taskId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {quickTaskIds.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
                No quick tasks configured. Add tasks above to enable one-click timer start from the Quick Actions menu in the top bar.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Billing & Hours</CardTitle>
          </div>
          <CardDescription>Configure billing hours calculation with rounding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableBilling"
              checked={enableBilling}
              onChange={(e) => setEnableBilling(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="enableBilling" className="cursor-pointer">
              Enable billing hours calculation with rounding
            </Label>
          </div>
          
          {enableBilling && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roundingThreshold">Rounding Threshold (minutes)</Label>
                <Input
                  id="roundingThreshold"
                  type="number"
                  value={roundingThreshold}
                  onChange={(e) => setRoundingThreshold(e.target.value)}
                  placeholder="3"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  Segments below this won't be billed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingIncrement">Billing Increment (hours)</Label>
                <select
                  id="billingIncrement"
                  value={billingIncrement}
                  onChange={(e) => setBillingIncrement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="0.25">0.25 (15 minutes)</option>
                  <option value="0.5">0.5 (30 minutes)</option>
                  <option value="1.0">1.0 (60 minutes)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Round to nearest increment
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recentEntriesCount">Recent Entries Count</Label>
                <Input
                  id="recentEntriesCount"
                  type="number"
                  value={recentEntriesCount}
                  onChange={(e) => setRecentEntriesCount(e.target.value)}
                  placeholder="20"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-muted-foreground">
                  Shown in dashboard (1-100)
                </p>
              </div>
            </div>
          )}
          
          <Button onClick={handleSaveBillingSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save Billing Settings
          </Button>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Display Preferences</CardTitle>
          </div>
          <CardDescription>Customize how information is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MMM d, yyyy">Feb 17, 2026</SelectItem>
                  <SelectItem value="dd/MM/yyyy">17/02/2026</SelectItem>
                  <SelectItem value="MM/dd/yyyy">02/17/2026</SelectItem>
                  <SelectItem value="yyyy-MM-dd">2026-02-17</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger id="timeFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entriesPerPage">Entries Per Page</Label>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger id="entriesPerPage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Theme</p>
            <p className="text-muted-foreground">
              Dark mode toggle is available in the top bar (moon/sun icon)
            </p>
          </div>
          <Button onClick={handleSaveDisplaySettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save Display Settings
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Configure notification preferences and reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableNotifications" className="text-base">
                Enable Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get browser notifications for tracking reminders and alerts
              </p>
            </div>
            <input
              type="checkbox"
              id="enableNotifications"
              checked={enableNotifications}
              onChange={(e) => setEnableNotifications(e.target.checked)}
              className="h-6 w-6 rounded border-gray-300 cursor-pointer"
            />
          </div>
          
          {enableNotifications && (
            <div className="space-y-6 pl-4 border-l-2 border-primary/20">
              {/* Time Tracking Reminder */}
              <div className="space-y-2">
                <Label htmlFor="reminderInterval" className="text-base">Time Tracking Reminder</Label>
                <Input
                  id="reminderInterval"
                  type="number"
                  value={reminderInterval}
                  onChange={(e) => setReminderInterval(e.target.value)}
                  placeholder="60"
                  min="5"
                />
                <p className="text-xs text-muted-foreground">
                  Remind to start tracking when no timer is running (minutes)
                </p>
              </div>

              {/* Break Reminder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="breakReminderEnabled" className="text-base">Break Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to take breaks during work
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="breakReminderEnabled"
                    checked={breakReminderEnabled}
                    onChange={(e) => setBreakReminderEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                  />
                </div>
                {breakReminderEnabled && (
                  <div className="space-y-2 pl-4">
                    <Label htmlFor="breakReminderInterval">Break Interval (minutes)</Label>
                    <Input
                      id="breakReminderInterval"
                      type="number"
                      value={breakReminderInterval}
                      onChange={(e) => setBreakReminderInterval(e.target.value)}
                      placeholder="120"
                      min="15"
                    />
                    <p className="text-xs text-muted-foreground">
                      Suggest taking a break after this duration of continuous work
                    </p>
                  </div>
                )}
              </div>

              {/* Continuous Work Alert */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="continuousWorkAlert" className="text-base">Continuous Work Alert</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when working too long without a break
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="continuousWorkAlert"
                    checked={continuousWorkAlert}
                    onChange={(e) => setContinuousWorkAlert(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                  />
                </div>
                {continuousWorkAlert && (
                  <div className="space-y-2 pl-4">
                    <Label htmlFor="continuousWorkDuration">Alert Threshold (minutes)</Label>
                    <Input
                      id="continuousWorkDuration"
                      type="number"
                      value={continuousWorkDuration}
                      onChange={(e) => setContinuousWorkDuration(e.target.value)}
                      placeholder="240"
                      min="60"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert if working this long without taking a break
                    </p>
                  </div>
                )}
              </div>

              {/* Daily Goal Notification */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dailyGoalNotification" className="text-base">Daily Goal Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when reaching daily work hour goals
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="dailyGoalNotification"
                  checked={dailyGoalNotification}
                  onChange={(e) => setDailyGoalNotification(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                />
              </div>

              {/* Notification Sound Selection */}
              <div className="space-y-3">
                <Label className="text-base">Notification Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Choose from available notification sounds
                </p>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">
                        {notificationSound === 'default' 
                          ? 'Default Beep' 
                          : notificationSound.replace(/\.[^/.]+$/, '').replace(/notification(\d+)/, 'Sound $1')
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Current selection</div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsSoundModalOpen(true)} 
                    variant="outline"
                    type="button"
                  >
                    Change Sound
                  </Button>
                </div>
              </div>

              {/* Sound Selection Modal */}
              <SoundSelectionModal
                isOpen={isSoundModalOpen}
                onClose={() => setIsSoundModalOpen(false)}
                currentSound={notificationSound}
                onSoundSelect={handleSoundSelect}
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={handleSaveNotificationSettings} className="gap-2">
              <Save className="h-4 w-4" />
              Save Notification Settings
            </Button>
            {enableNotifications && (
              <Button 
                onClick={async () => {
                  if (Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      alert('Please grant notification permission to test notifications');
                      return;
                    }
                  }
                  new Notification('Test Notification', {
                    body: 'If you see this, notifications are working! 🎉',
                    icon: '/vite.svg',
                  });
                }}
                variant="outline"
                className="gap-2"
              >
                Test Notification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Idle Detection Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Idle Detection</CardTitle>
          </div>
          <CardDescription>Automatically pause timers when you're away</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Enable Idle Detection */}
            <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="enableIdleDetection" className="text-base font-medium cursor-pointer">
                  Enable Idle Detection
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically pause running timers when no activity is detected
                </p>
              </div>
              <input
                type="checkbox"
                id="enableIdleDetection"
                checked={enableIdleDetection}
                onChange={(e) => setEnableIdleDetection(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 cursor-pointer"
              />
            </div>

            {enableIdleDetection && (
              <>
                {/* Idle Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="idleThresholdMinutes">Idle Threshold (minutes)</Label>
                  <Input
                    id="idleThresholdMinutes"
                    type="number"
                    min="1"
                    max="60"
                    value={idleThresholdMinutes}
                    onChange={(e) => setIdleThresholdMinutes(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Pause timer after {idleThresholdMinutes} minute{idleThresholdMinutes === '1' ? '' : 's'} of inactivity
                  </p>
                </div>

                {/* Auto Resume */}
                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="autoResumeOnActivity" className="text-base font-medium cursor-pointer">
                      Auto Resume on Activity
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically resume timer when activity is detected (without confirmation)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="autoResumeOnActivity"
                    checked={autoResumeOnActivity}
                    onChange={(e) => setAutoResumeOnActivity(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">How it works:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Tracks mouse, keyboard, and window activity</li>
                        <li>Pauses timer after {idleThresholdMinutes} minute{idleThresholdMinutes === '1' ? '' : 's'} of no activity</li>
                        <li>Shows notification when idle detected</li>
                        <li>{autoResumeOnActivity ? 'Automatically resumes' : 'Prompts to resume'} when you return</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button onClick={handleSaveIdleDetectionSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save Idle Detection Settings
          </Button>
        </CardContent>
      </Card>

      {/* System Idle Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <CardTitle>System Idle Detection</CardTitle>
          </div>
          <CardDescription>Cross-application activity monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!systemIdleSupported ? (
            // Not supported
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">System idle detection not available</p>
                  <p className="text-amber-800">
                    Your browser doesn't support system-level idle detection. Using browser-only detection instead.
                  </p>
                  <p className="text-amber-700 mt-2 text-xs">
                    <strong>Recommendation:</strong> Use Microsoft Edge or Google Chrome for best idle detection.
                  </p>
                </div>
              </div>
            </div>
          ) : systemIdlePermission === 'granted' ? (
            // Permission granted
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">✅ System idle detection active</p>
                    <p className="text-green-800">
                      Activity is monitored across all applications and monitors.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <Monitor className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">What's being detected:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Mouse and keyboard activity system-wide</li>
                      <li>Activity on any monitor or workspace</li>
                      <li>Activity in other applications (Word, Excel, etc.)</li>
                      <li>Screen lock/unlock events</li>
                    </ul>
                    <p className="mt-3 text-xs text-blue-700">
                      <strong>Current method:</strong> {detectionMethod === 'system-level' ? 'System-level ✅' : detectionMethod === 'browser-only' ? 'Browser-only ⚠️' : 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Permission not granted
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Monitor className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">Enable cross-application idle detection</p>
                    <p className="text-blue-800 mb-3">
                      Grant permission to detect your activity even when working in other applications or browsers.
                    </p>
                    <p className="font-medium mb-1">Benefits:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Works when using Word, Excel, Outlook, etc.</li>
                      <li>Detects activity on multiple monitors</li>
                      <li>More accurate idle detection</li>
                      <li>Reduces false positives</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleRequestSystemIdlePermission} 
                disabled={isRequestingPermission}
                className="gap-2 w-full"
              >
                {isRequestingPermission ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Requesting Permission...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Grant System Idle Detection Permission
                  </>
                )}
              </Button>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <strong>Privacy note:</strong> This permission allows the app to know when your computer is idle,
                  but does NOT track which applications you use or what you're doing. The detection happens locally
                  in your browser only.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PWA Installation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <CardTitle>Install as App</CardTitle>
          </div>
          <CardDescription>Run Timekeeper in a separate window with taskbar access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pwaInstalled ? (
            // Already installed
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-medium mb-1">✅ App installed successfully</p>
                  <p className="text-green-800">
                    Timekeeper is running as a standalone app. You can pin it to your taskbar for quick access.
                  </p>
                </div>
              </div>
            </div>
          ) : pwaCanInstall ? (
            // Can install
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">Install Timekeeper as a desktop app</p>
                    <p className="text-blue-800 mb-3">
                      Run Timekeeper in its own window with a dedicated taskbar icon - no more searching through browser tabs!
                    </p>
                    <p className="font-medium mb-1">Benefits:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Appears in Windows taskbar</li>
                      <li>Opens in dedicated window (no browser UI)</li>
                      <li>Fast access - click taskbar icon</li>
                      <li>Works offline</li>
                      <li>Auto-updates with new features</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={installPWA} 
                disabled={pwaInstalling}
                className="gap-2 w-full"
              >
                {pwaInstalling ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Install Timekeeper App
                  </>
                )}
              </Button>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Alternative installation:</strong> If the button doesn't work, you can also install from your browser:
                </p>
                <ul className="text-xs text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li>Edge: Click the <strong>⊕</strong> icon in the address bar → "Install Timekeeper"</li>
                  <li>Chrome: Click the <strong>⋮</strong> menu → "Install Timekeeper"</li>
                </ul>
              </div>
            </div>
          ) : !pwaSupported ? (
            // Not supported
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">App installation not available</p>
                  <p className="text-amber-800">
                    Your browser doesn't support Progressive Web App installation.
                  </p>
                  <p className="text-amber-700 mt-2 text-xs">
                    <strong>Recommendation:</strong> Use Microsoft Edge or Google Chrome for app installation.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Waiting for prompt
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-2">App installation will be available soon</p>
                  <p className="text-blue-800 mb-3">
                    Your browser supports app installation, but the install prompt hasn't appeared yet.
                  </p>
                  <p className="text-xs text-blue-700">
                    <strong>Manual installation:</strong> Look for the install icon in your browser's address bar or menu.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* How to pin to taskbar */}
          {pwaInstalled && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium mb-2">📌 Pin to Windows Taskbar:</p>
              <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1 ml-2">
                <li>Open the Start menu and find "Timekeeper"</li>
                <li>Right-click → "Pin to taskbar"</li>
                <li>Or drag the app icon to your taskbar</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Data Management</CardTitle>
          </div>
          <CardDescription>Export and manage your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Button onClick={handleExportData} variant="outline" className="gap-2 w-full">
                <Download className="h-4 w-4" />
                Export All Data (CSV)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Download all time entries as a CSV file for backup
              </p>
            </div>

            <div>
              <Button onClick={handleClearLocalSettings} variant="outline" className="gap-2 w-full">
                <RefreshCw className="h-4 w-4" />
                Reset All Settings
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Reset all preferences to default values
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Database Location</p>
              <code className="text-xs bg-muted p-2 rounded block">
                Timekeeper.Core/Data/timekeeper.db
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                The database file is stored in your application data directory
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About Timekeeper</CardTitle>
          <CardDescription>Application information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Version:</strong> 2.0.0 (React Edition)</p>
            <p><strong>Framework:</strong> React 18 + TypeScript + Vite</p>
            <p><strong>Backend:</strong> ASP.NET Core 8.0</p>
            <p><strong>Database:</strong> SQLite with Entity Framework Core</p>
            <p className="pt-4 text-muted-foreground">
              Modern time tracking application with intuitive interface and comprehensive reporting.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
