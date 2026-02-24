import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Plus, Search, Edit, Trash2, Upload, Download, Filter, X, ArrowUpDown } from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useImportTasks } from '../hooks/useTasks'
import { useCustomers } from '../hooks/useCustomers'
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
  const [showFilters, setShowFilters] = useState(false)
  const [filterCustomer, setFilterCustomer] = useState<string>('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterProcurement, setFilterProcurement] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'position' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const { data: tasks = [], isLoading } = useTasks({ search })
  const { data: projects = [] } = useProjects({ isActive: true })
  const { data: allCustomers = [] } = useCustomers()
  const { data: allProjects = [] } = useProjects()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const importTasks = useImportTasks()
  const hasExistingImportData = allCustomers.length > 0 || allProjects.length > 0

  const [formData, setFormData] = useState<TaskDto>({
    name: '',
    description: '',
    position: '',
    procurementNumber: '',
    projectId: 0,
    isActive: true,
  })

  const openCreateDialog = () => {
    setEditingTask(null)
    setFormData({
      name: '',
      description: '',
      position: '',
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

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks]

    // Apply filters
    if (filterCustomer) {
      result = result.filter(task => task.customerName?.toLowerCase().includes(filterCustomer.toLowerCase()))
    }
    if (filterProject) {
      result = result.filter(task => task.projectName?.toLowerCase().includes(filterProject.toLowerCase()))
    }
    if (filterStatus !== 'all') {
      result = result.filter(task => task.isActive === (filterStatus === 'active'))
    }
    if (filterPosition) {
      result = result.filter(task => task.position?.toLowerCase().includes(filterPosition.toLowerCase()))
    }
    if (filterProcurement) {
      result = result.filter(task => task.procurementNumber?.toLowerCase().includes(filterProcurement.toLowerCase()))
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'position':
          comparison = (a.position || '').localeCompare(b.position || '')
          break
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [tasks, filterCustomer, filterProject, filterStatus, filterPosition, filterProcurement, sortBy, sortOrder])

  const clearFilters = () => {
    setFilterCustomer('')
    setFilterProject('')
    setFilterStatus('all')
    setFilterPosition('')
    setFilterProcurement('')
  }

  const hasActiveFilters = filterCustomer || filterProject || filterStatus !== 'all' || filterPosition || filterProcurement

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
            {hasExistingImportData ? 'Export' : 'Template'}
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
                {filteredAndSortedTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                {hasActiveFilters && ' (filtered)'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
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
          
          {/* Filter Section */}
          {showFilters && (
            <Card className="mt-4 bg-accent/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filterCustomer">Customer</Label>
                    <Input
                      id="filterCustomer"
                      placeholder="Filter by customer..."
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="filterProject">Project</Label>
                    <Input
                      id="filterProject"
                      placeholder="Filter by project..."
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="filterStatus">Status</Label>
                    <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                      <SelectTrigger id="filterStatus">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="filterPosition">Position</Label>
                    <Input
                      id="filterPosition"
                      placeholder="Filter by position..."
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="filterProcurement">Procurement No</Label>
                    <Input
                      id="filterProcurement"
                      placeholder="Filter by procurement..."
                      value={filterProcurement}
                      onChange={(e) => setFilterProcurement(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sortBy">Sort By</Label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger id="sortBy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="position">Position</SelectItem>
                          <SelectItem value="date">Created Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading tasks...</p>
          ) : filteredAndSortedTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {tasks.length === 0 
                ? 'No tasks found. Create your first task or import from Excel!'
                : 'No tasks match your filters. Try adjusting your filter criteria.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedTasks.map((task) => (
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
                    type="text"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Optional (e.g., 1.1, A-01, etc.)"
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
                  {hasExistingImportData
                    ? 'Download the export to review and update existing customers, projects, and tasks'
                    : 'Download the template to see the required format'}
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
