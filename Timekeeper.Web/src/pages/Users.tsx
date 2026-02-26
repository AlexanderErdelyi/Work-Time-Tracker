import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { useWorkspaceContext } from '../hooks/useWorkspaceContext'
import { workspacesApi } from '../api'
import type { UserRole } from '../types'
import { KeyRound, Trash2, User, UserPlus } from 'lucide-react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { toast } from 'sonner'

export function Users() {
  const queryClient = useQueryClient()
  const { data: workspaceContext, isLoading: isLoadingContext } = useWorkspaceContext()
  const isAdminUser = workspaceContext?.currentUser.role === 'Admin'

  // Confirm dialog hook
  const { confirm, confirmState, handleConfirm: onConfirm, handleCancel: onCancelConfirm } = useConfirm()

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>('Member')

  const { data: workspaceUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['workspace-users'],
    queryFn: () => workspacesApi.getCurrentUsers(),
    enabled: isAdminUser,
  })

  const usersSorted = useMemo(
    () => [...workspaceUsers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [workspaceUsers],
  )

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
      toast.success('User account created successfully')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not create user.'
      toast.error(message)
    },
  })

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      workspacesApi.updateUserRole(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
      toast.success('User role updated successfully')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not update role.'
      toast.error(message)
    },
  })

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      workspacesApi.updateUserStatus(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
      toast.success('User status updated successfully')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not update status.'
      toast.error(message)
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      workspacesApi.resetUserPassword(id, { newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
      toast.success('Password has been reset successfully')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not reset password.'
      toast.error(message)
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => workspacesApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] })
      toast.success('Account deleted successfully')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not delete account.'
      toast.error(message)
    },
  })

  const handleCreateUser = () => {
    if (!newUserName.trim()) {
      toast.error('Display name is required.')
      return
    }

    if (!newUserEmail.trim()) {
      toast.error('Email is required.')
      return
    }

    createUserMutation.mutate()
  }

  const handleResetPassword = (id: number) => {
    const newPassword = window.prompt('Enter a new password (minimum 8 characters):', '') ?? ''
    if (!newPassword) {
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }

    resetPasswordMutation.mutate({ id, newPassword })
  }

  const handleDeleteUser = async (id: number, displayName: string) => {
    const confirmed = await confirm({
      title: 'Delete User Account',
      description: `Delete account "${displayName}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    })
    if (!confirmed) {
      return
    }

    deleteUserMutation.mutate(id)
  }

  if (!isLoadingContext && !isAdminUser) {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          View all created accounts and manage workspace users
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Create Account</CardTitle>
          </div>
          <CardDescription>Add a new user to this workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="newUserName">Display name</Label>
              <Input
                id="newUserName"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                placeholder="Alex Johnson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserEmail">Email</Label>
              <Input
                id="newUserEmail"
                type="email"
                value={newUserEmail}
                onChange={(event) => setNewUserEmail(event.target.value)}
                placeholder="alex@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserRole">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                <SelectTrigger id="newUserRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
            Create user
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Workspace Accounts</CardTitle>
          </div>
          <CardDescription>
            {isLoadingUsers ? 'Loading users...' : `${usersSorted.length} account(s) in this workspace`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersSorted.length === 0 && !isLoadingUsers ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            usersSorted.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Login: {user.loginMethod}</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value) =>
                      updateUserRoleMutation.mutate({ id: user.id, role: value as UserRole })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={user.isActive ? 'destructive' : 'outline'}
                    onClick={() => updateUserStatusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                    disabled={workspaceContext?.currentUser.id === user.id}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  {user.canResetPassword && (
                    <Button
                      variant="outline"
                      onClick={() => handleResetPassword(user.id)}
                      disabled={workspaceContext?.currentUser.id === user.id}
                      title="Reset password (email login accounts only)"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset password
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteUser(user.id, user.displayName)}
                    disabled={workspaceContext?.currentUser.id === user.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
