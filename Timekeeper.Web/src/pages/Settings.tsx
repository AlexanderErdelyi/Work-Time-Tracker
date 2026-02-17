import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import SoundSelectionModal from '../components/SoundSelectionModal'
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
