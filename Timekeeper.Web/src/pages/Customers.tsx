import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Plus, Search, Edit, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder, ListTree } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useBulkDeleteCustomers } from '../hooks/useCustomers'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/Dialog'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import type { Customer, CustomerDto } from '../types'
import { formatDate } from '../lib/dateUtils'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { toast } from 'sonner'

export function Customers() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set())
  
  const { data: customers = [], isLoading } = useCustomers({ search })
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const bulkDeleteCustomers = useBulkDeleteCustomers()

  // Confirm dialog hook
  const { confirm, confirmState, handleConfirm: onConfirm, handleCancel: onCancelConfirm } = useConfirm()

  const [formData, setFormData] = useState<CustomerDto>({
    name: '',
    no: '',
    description: '',
    isActive: true,
  })

  const openCreateDialog = () => {
    setEditingCustomer(null)
    setFormData({
      name: '',
      no: '',
      description: '',
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      no: customer.no || '',
      description: customer.description || '',
      isActive: customer.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          data: formData,
        })
        toast.success('Customer updated successfully')
      } else {
        await createCustomer.mutateAsync(formData)
        toast.success('Customer created successfully')
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save customer:', error)
      toast.error('Failed to save customer. Please try again.')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete Customer',
      description: 'Are you sure you want to delete this customer? It may have associated projects.',
      confirmText: 'Delete',
      variant: 'destructive',
    })
    if (!confirmed) {
      return
    }
    try {
      await deleteCustomer.mutateAsync(id)
      toast.success('Customer deleted successfully')
    } catch (error) {
      console.error('Failed to delete customer:', error)
      toast.error('Failed to delete customer. It may have associated projects.')
    }
  }

  const toggleActive = async (customer: Customer) => {
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: {
          ...customer,
          isActive: !customer.isActive,
        },
      })
      toast.success(`Customer ${!customer.isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error('Failed to toggle customer status:', error)
      toast.error('Failed to update customer status. Please try again.')
    }
  }

  const toggleCustomerExpanded = (customerId: number) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  const toggleProjectExpanded = (projectId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const toggleSelectCustomer = (customerId: number) => {
    setSelectedCustomerIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedCustomerIds.size === customers.length) {
      setSelectedCustomerIds(new Set())
    } else {
      setSelectedCustomerIds(new Set(customers.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    const count = selectedCustomerIds.size
    if (count === 0) return

    const confirmed = await confirm({
      title: 'Delete Customers',
      description: `Are you sure you want to delete ${count} customer${count > 1 ? 's' : ''}? This will also delete all associated projects, tasks, and time entries.`,
      confirmText: 'Delete All',
      variant: 'destructive',
    })
    if (!confirmed) {
      return
    }

    try {
      const result = await bulkDeleteCustomers.mutateAsync(Array.from(selectedCustomerIds))
      setSelectedCustomerIds(new Set())
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`Deleted ${result.deletedCount} customers with errors: ${result.errors.join(', ')}`)
      } else {
        toast.success(`Successfully deleted ${result.deletedCount} customer${result.deletedCount > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Failed to delete customers:', error)
      toast.error('Failed to delete customers. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <Folder className="h-4 w-4" />
            List View
          </Button>
          <Button 
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            onClick={() => setViewMode('tree')}
            className="gap-2"
          >
            <ListTree className="h-4 w-4" />
            Tree View
          </Button>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            New Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>
                {customers.length} customer{customers.length !== 1 ? 's' : ''} total
                {selectedCustomerIds.size > 0 && (
                  <span className="ml-2 text-primary">
                    ({selectedCustomerIds.size} selected)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedCustomerIds.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteCustomers.isPending}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedCustomerIds.size})
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
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
            <p className="text-center text-muted-foreground py-8">Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No customers found. Create your first customer to get started!
            </p>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {customers.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.size === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              )}
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.has(customer.id)}
                      onChange={() => toggleSelectCustomer(customer.id)}
                      className="h-4 w-4 rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{customer.name}</h3>
                        {customer.no && (
                          <span className="text-sm text-muted-foreground">({customer.no})</span>
                        )}
                        <Badge
                          variant={customer.isActive ? 'success' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => toggleActive(customer)}
                        >
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {customer.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {customer.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {formatDate(customer.createdAt, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(customer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {customers.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.size === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              )}
              {customers.map((customer) => (
                <CustomerTreeItem
                  key={customer.id}
                  customer={customer}
                  isExpanded={expandedCustomers.has(customer.id)}
                  onToggleExpanded={() => toggleCustomerExpanded(customer.id)}
                  expandedProjects={expandedProjects}
                  onToggleProject={toggleProjectExpanded}
                  onEditCustomer={openEditDialog}
                  onDeleteCustomer={handleDelete}
                  onToggleActive={toggleActive}
                  isSelected={selectedCustomerIds.has(customer.id)}
                  onToggleSelect={() => toggleSelectCustomer(customer.id)}
                />
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
                {editingCustomer ? 'Edit Customer' : 'Create Customer'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? 'Update customer information'
                  : 'Add a new customer to your database'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="no">Number</Label>
                <Input
                  id="no"
                  value={formData.no}
                  onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                  placeholder="Optional customer number"
                />
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
                disabled={createCustomer.isPending || updateCustomer.isPending}
              >
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onOpenChange={onCancelConfirm}
        onConfirm={onConfirm}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  )
}

// Customer Tree Item Component
interface CustomerTreeItemProps {
  customer: Customer
  isExpanded: boolean
  onToggleExpanded: () => void
  expandedProjects: Set<number>
  onToggleProject: (projectId: number) => void
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (id: number) => void
  onToggleActive: (customer: Customer) => void
  isSelected: boolean
  onToggleSelect: () => void
}

function CustomerTreeItem({
  customer,
  isExpanded,
  onToggleExpanded,
  expandedProjects,
  onToggleProject,
  onEditCustomer,
  onDeleteCustomer,
  onToggleActive,
  isSelected,
  onToggleSelect,
}: CustomerTreeItemProps) {
  const { data: projects = [] } = useProjects({ customerId: customer.id })

  return (
    <div className="border rounded-lg">
      {/* Customer Header */}
      <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">{customer.name}</h3>
          {customer.no && (
            <span className="text-sm text-muted-foreground">({customer.no})</span>
          )}
          <Badge
            variant={customer.isActive ? 'success' : 'secondary'}
            className="cursor-pointer"
            onClick={() => onToggleActive(customer)}
          >
            {customer.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({projects.length} project{projects.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditCustomer(customer)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteCustomer(customer.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects List (when expanded) */}
      {isExpanded && (
        <div className="pl-8 pr-4 pb-4 space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No projects yet. Add a project to get started!
            </p>
          ) : (
            projects.map((project) => (
              <ProjectTreeItem
                key={project.id}
                project={project}
                isExpanded={expandedProjects.has(project.id)}
                onToggleExpanded={() => onToggleProject(project.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Project Tree Item Component
interface ProjectTreeItemProps {
  project: any
  isExpanded: boolean
  onToggleExpanded: () => void
}

function ProjectTreeItem({
  project,
  isExpanded,
  onToggleExpanded,
}: ProjectTreeItemProps) {
  const { data: tasks = [] } = useTasks({ projectId: project.id })

  return (
    <div className="border-l-2 border-l-accent pl-4">
      {/* Project Header */}
      <div className="flex items-center justify-between py-2 hover:bg-accent/30 transition-colors rounded px-2">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          <Folder className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{project.name}</span>
          {project.no && (
            <span className="text-xs text-muted-foreground">({project.no})</span>
          )}
          <Badge variant={project.isActive ? 'success' : 'secondary'} className="text-xs">
            {project.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({tasks.length} task{tasks.length !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {/* Tasks List (when expanded) */}
      {isExpanded && (
        <div className="pl-6 space-y-1 mt-1">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              No tasks yet.
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 py-1 px-2 hover:bg-accent/20 rounded text-xs"
              >
                <ListTree className="h-3 w-3 text-muted-foreground" />
                <span>{task.name}</span>
                {task.position && (
                  <span className="text-muted-foreground">({task.position})</span>
                )}
                <Badge variant={task.isActive ? 'success' : 'secondary'} className="text-xs">
                  {task.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
