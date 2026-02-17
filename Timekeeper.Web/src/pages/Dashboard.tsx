import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Play, Square, Clock, Search } from 'lucide-react'
import { useRunningTimer, useStartTimer, useStopTimer } from '../hooks/useTimeEntries'
import { useTasks } from '../hooks/useTasks'
import { useState, useEffect, useMemo } from 'react'
import { calculateDuration } from '../lib/durationUtils'

export function Dashboard() {
  const { data: runningTimer } = useRunningTimer()
  const { data: tasks = [] } = useTasks({ isActive: true })
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const [elapsed, setElapsed] = useState('00:00:00')
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!runningTimer) {
      setElapsed('00:00:00')
      return
    }

    const updateElapsed = () => {
      const duration = calculateDuration(runningTimer.startTime)
      setElapsed(duration)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [runningTimer])

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks
    const lower = searchTerm.toLowerCase()
    return tasks.filter(task =>
      task.name?.toLowerCase().includes(lower) ||
      task.projectName?.toLowerCase().includes(lower) ||
      task.customerName?.toLowerCase().includes(lower)
    )
  }, [tasks, searchTerm])

  const handleStartTimer = () => {
    if (!selectedTaskId) return
    
    startTimer.mutate(
      { 
        taskId: selectedTaskId,
        notes: notes || undefined
      },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setSelectedTaskId(undefined)
          setSearchTerm('')
          setNotes('')
        }
      }
    )
  }

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId)
  }

  const handleQuickStart = () => {
    startTimer.mutate(
      { 
        notes: 'Quick start from dashboard'
      },
      {
        onSuccess: () => {
          setSelectedTaskId(undefined)
          setSearchTerm('')
          setNotes('')
        }
      }
    )
  }

  const handleStopTimer = () => {
    if (runningTimer) {
      stopTimer.mutate(runningTimer.id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your modern time tracking workspace
        </p>
      </div>

      {/* Timer Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Quick Timer
          </CardTitle>
          <CardDescription>
            Start tracking time instantly or select a task first
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Large Timer Display */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-6xl font-mono font-bold tracking-wider">
              {elapsed}
            </div>
            {runningTimer && runningTimer.taskName && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {runningTimer.customerName} / {runningTimer.projectName}
                </p>
                <p className="text-lg font-medium">{runningTimer.taskName}</p>
              </div>
            )}
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-4">
            {runningTimer ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopTimer}
                disabled={stopTimer.isPending}
                className="gap-2"
              >
                <Square className="h-5 w-5" />
                Stop Timer
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleQuickStart}
                  disabled={startTimer.isPending}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  Quick Start
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2">
                      <Clock className="h-5 w-5" />
                      Start with Task
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[700px]">
                  <DialogHeader>
                    <DialogTitle>Start New Timer</DialogTitle>
                    <DialogDescription>
                      Select a task and add optional notes to begin tracking time
                    </DialogDescription>
                  </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tasks, projects, or customers..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {/* Task List */}
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {filteredTasks.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            {searchTerm ? 'No tasks found' : 'No active tasks available'}
                          </p>
                        ) : (
                          filteredTasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => handleSelectTask(task.id)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                selectedTaskId === task.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-accent hover:border-primary'
                              }`}
                            >
                              <div className="font-medium">{task.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {task.customerName} / {task.projectName}
                              </div>
                              {(task.position || task.procurementNumber) && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {task.position && <span>Position: {task.position}</span>}
                                  {task.position && task.procurementNumber && <span> • </span>}
                                  {task.procurementNumber && <span>Procurement: {task.procurementNumber}</span>}
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Notes (Optional)
                        </label>
                        <Textarea
                          placeholder="Describe what you're working on..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      {/* Start Button */}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false)
                            setSelectedTaskId(undefined)
                            setNotes('')
                            setSearchTerm('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleStartTimer}
                          disabled={!selectedTaskId || startTimer.isPending}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Start Timer
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00h</div>
            <p className="text-xs text-muted-foreground">of 8.00h target</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00h</div>
            <p className="text-xs text-muted-foreground">of 40.00h target</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">currently tracking</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Your last 10 time entries</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No recent entries yet. Start tracking time to see your activity here!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
