import { useState } from 'react'
import { 
  Play, 
  Download, 
  ChevronDown, 
  Zap 
} from 'lucide-react'
import { Button } from './ui/Button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/DropdownMenu'
import { useStartTimer } from '../hooks/useTimeEntries'
import { useTasks } from '../hooks/useTasks'
import { exportApi } from '../api/export'

export function QuickActionsDropdown() {
  const startTimer = useStartTimer()
  const [isExporting, setIsExporting] = useState(false)
  
  // Get quick task IDs from localStorage
  const quickTaskIds = JSON.parse(localStorage.getItem('timekeeper_quickTasks') || '[]') as number[]
  
  // Fetch all active tasks
  const { data: allTasks = [] } = useTasks({ isActive: true })
  
  // Filter to only include quick tasks
  const quickTasks = allTasks.filter(task => quickTaskIds.includes(task.id))

  const handleStartQuickTimer = (taskId: number, taskName: string) => {
    startTimer.mutate(
      { taskId, notes: `Quick start: ${taskName}` },
      {
        onSuccess: () => {
          // Success feedback already handled by mutation
        }
      }
    )
  }

  const handleExportTodayExcel = async () => {
    try {
      setIsExporting(true)
      await exportApi.exportTodayExcel()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Actions</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {quickTasks.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Start Quick Timer
            </DropdownMenuLabel>
            {quickTasks.map((task) => (
              <DropdownMenuItem
                key={task.id}
                onClick={() => handleStartQuickTimer(task.id, task.name)}
                disabled={startTimer.isPending}
                className="cursor-pointer"
              >
                <Play className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">{task.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.customerName} / {task.projectName}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        {quickTasks.length === 0 && (
          <>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              No quick tasks configured
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Configure in Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Export
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleExportTodayExcel}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : "Export Today's Work (Excel)"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
