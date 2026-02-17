import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { 
  User,
  Clock, 
  Palette, 
  Bell, 
  Download, 
  Database,
  Save,
  RefreshCw,
} from 'lucide-react'

export function Settings() {
  // User Settings
  const [userName, setUserName] = useState(localStorage.getItem('timekeeper_userName') || '')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('timekeeper_userEmail') || '')

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
    localStorage.getItem('timekeeper_notifications') === 'true'
  )
  const [reminderInterval, setReminderInterval] = useState(
    localStorage.getItem('timekeeper_reminderInterval') || '60'
  )

  const handleSaveUserSettings = () => {
    localStorage.setItem('timekeeper_userName', userName)
    localStorage.setItem('timekeeper_userEmail', userEmail)
    alert('User settings saved!')
  }

  const handleSaveTrackingSettings = () => {
    localStorage.setItem('timekeeper_breakDuration', defaultBreakDuration)
    localStorage.setItem('timekeeper_weeklyTarget', weeklyHoursTarget)
    localStorage.setItem('timekeeper_dailyTarget', dailyHoursTarget)
    alert('Time tracking settings saved!')
  }

  const handleSaveDisplaySettings = () => {
    localStorage.setItem('timekeeper_dateFormat', dateFormat)
    localStorage.setItem('timekeeper_timeFormat', timeFormat)
    localStorage.setItem('timekeeper_entriesPerPage', entriesPerPage)
    alert('Display settings saved! Refresh the page to see changes.')
  }

  const handleSaveNotificationSettings = () => {
    localStorage.setItem('timekeeper_notifications', enableNotifications.toString())
    localStorage.setItem('timekeeper_reminderInterval', reminderInterval)
    alert('Notification settings saved!')
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
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableNotifications" className="text-base">
                Enable Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get reminders to track your time
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
            <div className="space-y-2">
              <Label htmlFor="reminderInterval">Reminder Interval (minutes)</Label>
              <Input
                id="reminderInterval"
                type="number"
                value={reminderInterval}
                onChange={(e) => setReminderInterval(e.target.value)}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                How often to remind you to track time when no timer is running
              </p>
            </div>
          )}
          <Button onClick={handleSaveNotificationSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save Notification Settings
          </Button>
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
