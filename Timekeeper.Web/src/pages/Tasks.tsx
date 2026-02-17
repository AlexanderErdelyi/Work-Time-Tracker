import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Plus, Search, Edit, Trash2, Upload, Download } from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useImportTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { importApi } from '../api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/Dialog'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import type { TaskItem, TaskDto } from '../types'
import { formatDate } from '../lib/dateUtils'

export function Tasks() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  
  const { data: tasks = [], isLoading } = useTasks({ search })
  const { data: projects = [] } = useProjects({ isActive: true })
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const importTasks = useImportTasks()

  const [formData, setFormData] = useState<TaskDto>({
    name: '',
    description: '',
    position: undefined,
    procurementNumber: '',
    projectId: 0,
    isActive: true,
  })

  const openCreateDialog = () => {
    setEditingTask(null)
    setFormData({
      name: '',
      description: '',
      position: undefined,
      procurementNumber: '',
      projectId: projects[0]?.id || 0,
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (task: TaskItem) => {
    setEditingTask(task)
    setFormData({
      name: task.name,
      description: task.description || '',
      position: task.position,
      procurementNumber: task.procurementNumber || '',
      projectId: task.projectId,
      isActive: task.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingTask) {
        await updateTask.mutateAsync({
          id: editingTask.id,
          data: formData,
        })
      } else {
        await createTask.mutateAsync(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete task:', error)
        alert('Failed to delete task. It may have associated time entries.')
      }
    }
  }

  const toggleActive = async (task: TaskItem) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          ...task,
          isActive: !task.isActive,
        },
      })
    } catch (error) {
      console.error('Failed to toggle task status:', error)
    }
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) return

    try {
      const result = await importTasks.mutateAsync(importFile)
      alert(`Import successful!\nCustomers: ${result.customersCreated} created, ${result.customersUpdated} updated\nProjects: ${result.projectsCreated} created, ${result.projectsUpdated} updated\nTasks: ${result.tasksCreated} created, ${result.tasksUpdated} updated`)
      setIsImportDialogOpen(false)
      setImportFile(null)
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed. Please check your file format.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage tasks across all projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => importApi.downloadTemplate()} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tasks found. Create your first task or import from Excel!
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{task.name}</h3>
                      {task.procurementNumber && (
                        <span className="text-sm text-muted-foreground">({task.procurementNumber})</span>
                      )}
                      <Badge
                        variant={task.isActive ? 'success' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleActive(task)}
                      >
                        {task.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.customerName && <span className="font-medium">{task.customerName}</span>}
                      {task.customerName && task.projectName && <span> / </span>}
                      {task.projectName && <span className="font-medium">{task.projectName}</span>}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {formatDate(task.createdAt, 'MMM d, yyyy')}
                      {task.position && ` • Position: ${task.position}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Task' : 'Create Task'}
              </DialogTitle>
              <DialogDescription>
                {editingTask
                  ? 'Update task information'
                  : 'Add a new task to your project'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.projectId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.customerName} / {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Task Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="procurementNumber">Procurement Number</Label>
                  <Input
                    id="procurementNumber"
                    value={formData.procurementNumber}
                    onChange={(e) => setFormData({ ...formData, procurementNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTask.isPending || updateTask.isPending}
              >
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <form onSubmit={handleImportSubmit}>
            <DialogHeader>
              <DialogTitle>Import Tasks</DialogTitle>
              <DialogDescription>
                Upload an Excel file to bulk import customers, projects, and tasks
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Excel File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Download the template to see the required format
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!importFile || importTasks.isPending}
              >
                Import
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
