import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTasks } from '../hooks/useTasks'
import type { TaskItem } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import {
  ActivityIcon,
  Check,
  X,
  RefreshCw,
  CheckCheck,
  Calendar,
  Clock,
  Link,
  Zap,
  CircleDot,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  Mail,
  Bug,
  ChevronDown,
  ExternalLink,
  Pencil,
  Search,
} from 'lucide-react'
import { activityApi, integrationsApi } from '../api/activity'
import type { ActivityEvent } from '../api/activity'
import { toast } from 'sonner'

const sourceIcons: Record<string, React.ReactNode> = {
  OutlookCalendar: <Calendar className="h-4 w-4" />,
  TeamsMeeting: <Calendar className="h-4 w-4 text-blue-500" />,
  TeamsChat: <MessageSquare className="h-4 w-4 text-blue-500" />,
  OutlookEmail: <Mail className="h-4 w-4" />,
  AzureDevOpsWorkItem: <CircleDot className="h-4 w-4 text-blue-600" />,
  AzureDevOpsCommit: <GitCommit className="h-4 w-4 text-orange-500" />,
  AzureDevOpsPullRequest: <GitPullRequest className="h-4 w-4 text-purple-500" />,
  GitHubCommit: <GitCommit className="h-4 w-4 text-gray-700 dark:text-gray-300" />,
  GitHubPullRequest: <GitPullRequest className="h-4 w-4 text-gray-700 dark:text-gray-300" />,
}

const sourceLabels: Record<string, string> = {
  OutlookCalendar: 'Calendar',
  TeamsMeeting: 'Teams Meeting',
  TeamsChat: 'Teams Chat',
  OutlookEmail: 'Email',
  AzureDevOpsWorkItem: 'ADO Work Item',
  AzureDevOpsCommit: 'ADO Commit',
  AzureDevOpsPullRequest: 'ADO Pull Request',
  GitHubCommit: 'GitHub Commit',
  GitHubPullRequest: 'GitHub PR',
}

const confidenceBadge = (confidence?: string) => {
  if (!confidence) return null
  if (confidence === 'rule-based') return <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Rule match</Badge>
  if (confidence === 'ai') return <Badge variant="outline" className="text-xs text-purple-600 border-purple-200"><Zap className="h-3 w-3 mr-1" />AI</Badge>
  return null
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatStartTime(dt?: string): string {
  if (!dt) return ''
  const d = new Date(dt)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = d.toDateString() === today.toDateString()
  const wasYesterday = d.toDateString() === yesterday.toDateString()

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Today ${timeStr}`
  if (wasYesterday) return `Yesterday ${timeStr}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr
}

interface ActivityEventCardProps {
  event: ActivityEvent
  tasks: TaskItem[]
  onAccept: (id: number, overrides?: { taskId?: number; notes?: string; minutes?: number }) => void
  onDismiss: (id: number) => void
  acceptingId: number | null
  dismissingId: number | null
}

function ActivityEventCard({ event, tasks, onAccept, onDismiss, acceptingId, dismissingId }: ActivityEventCardProps) {
  const navigate = useNavigate()
  const hasSuggestion = !!(event.suggestedProjectName || event.suggestedTaskName || event.suggestedCustomerName)
  const isAccepting = acceptingId === event.id
  const isDismissing = dismissingId === event.id
  const [isEditing, setIsEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editMinutes, setEditMinutes] = useState<number>(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>()

  const filteredTasks = tasks.filter(t => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      t.name?.toLowerCase().includes(q) ||
      t.customerName?.toLowerCase().includes(q) ||
      t.projectName?.toLowerCase().includes(q)
    )
  })

  function openEdit() {
    setEditNotes(event.suggestedNotes ?? '')
    setEditMinutes(event.estimatedMinutes)
    setSelectedTaskId(event.suggestedTaskId)
    setSearchTerm('')
    setIsEditing(true)
  }

  function handleAccept() {
    if (isEditing) {
      onAccept(event.id, {
        taskId: selectedTaskId,
        notes: editNotes || undefined,
        minutes: editMinutes || undefined,
      })
      setIsEditing(false)
    } else {
      onAccept(event.id)
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="mt-1 text-muted-foreground">
        {sourceIcons[event.source] ?? <ActivityIcon className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-medium text-sm truncate">{event.title}</p>
              {event.externalUrl && (
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  onClick={e => e.stopPropagation()}
                  title="Open in Azure DevOps"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{sourceLabels[event.source] ?? event.source}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />{formatDuration(event.estimatedMinutes)}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatStartTime(event.startTime)}</span>
            </div>
          </div>
          {event.suggestionState === 'Pending' && (
            <div className="flex gap-1 shrink-0">
              {!isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={openEdit}
                  title="Edit before accepting"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleAccept}
                disabled={isAccepting || isDismissing}
                title={isEditing ? 'Accept with edits' : 'Accept'}
              >
                {isAccepting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              {isEditing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditing(false)}
                  title="Cancel edit"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDismiss(event.id)}
                  disabled={isAccepting || isDismissing}
                >
                  {isDismissing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          )}
          {event.suggestionState === 'Accepted' && (
            <Badge
              variant="outline"
              className="text-xs text-green-600 border-green-200 shrink-0 cursor-pointer hover:bg-green-50"
              onClick={() => navigate('/time-entries')}
            >
              <Check className="h-3 w-3 mr-1" />Accepted
            </Badge>
          )}
          {event.suggestionState === 'Dismissed' && (
            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Dismissed</Badge>
          )}
        </div>

        {hasSuggestion && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {confidenceBadge(event.confidence)}
            {event.suggestedCustomerName && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{event.suggestedCustomerName}</span>
            )}
            {event.suggestedProjectName && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{event.suggestedProjectName}</span>
            )}
            {event.suggestedTaskName && (
              <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">{event.suggestedTaskName}</span>
            )}
          </div>
        )}

        {event.suggestedNotes && !isEditing && (
          <div className="mt-1 text-xs text-muted-foreground italic truncate">
            Note: {event.suggestedNotes}
          </div>
        )}

        {isEditing && (
          <div className="mt-2 border-t pt-2 space-y-2">
            {/* Task search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks, customers, projects…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-md border bg-popover p-1">
              {filteredTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {searchTerm ? 'No tasks found' : 'No active tasks'}
                </p>
              ) : (
                filteredTasks.slice(0, 25).map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors ${
                      selectedTaskId === task.id
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="font-medium">{task.name}</div>
                    <div className="text-muted-foreground">
                      {task.customerName}{task.projectName ? ` / ${task.projectName}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
            {/* Notes */}
            <textarea
              className="w-full rounded border bg-background px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Notes for time entry…"
            />
            {/* Duration */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">Duration:</label>
              <input
                type="number"
                min={1}
                max={480}
                value={editMinutes}
                onChange={e => setEditMinutes(Number(e.target.value))}
                className="w-20 rounded border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
        )}

        {event.linkedTimeEntryId && (
          <div
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-primary"
            onClick={() => navigate('/time-entries')}
          >
            <Link className="h-3 w-3" />
            <span>Linked to entry #{event.linkedTimeEntryId}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function Activity() {
  const queryClient = useQueryClient()
  const [stateFilter, setStateFilter] = useState('Pending')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [dismissingId, setDismissingId] = useState<number | null>(null)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['activity', 'events', stateFilter, sourceFilter],
    queryFn: () => activityApi.list({
      state: stateFilter !== 'all' ? stateFilter : undefined,
      source: sourceFilter !== 'all' ? sourceFilter : undefined,
    }),
    refetchInterval: stateFilter === 'Pending' ? 30_000 : undefined,
  })

  const { data: summary } = useQuery({
    queryKey: ['activity', 'summary'],
    queryFn: activityApi.getSummary,
    refetchInterval: 30_000,
  })

  const { data: tasks = [] } = useTasks({ isActive: true })

  const acceptMutation = useMutation({
    mutationFn: ({ id, overrides }: { id: number; overrides?: { taskId?: number; notes?: string; minutes?: number } }) =>
      activityApi.accept(id, { taskId: overrides?.taskId, notes: overrides?.notes, overrideMinutes: overrides?.minutes }),
    onMutate: ({ id }) => setAcceptingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      toast.success('Time entry created from activity')
    },
    onError: () => toast.error('Failed to accept suggestion'),
    onSettled: () => setAcceptingId(null),
  })

  const dismissMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => activityApi.dismiss(id),
    onMutate: ({ id }) => setDismissingId(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity'] }),
    onError: () => toast.error('Failed to dismiss'),
    onSettled: () => setDismissingId(null),
  })

  const acceptAllMutation = useMutation({
    mutationFn: activityApi.acceptAll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      toast.success(`Created ${data.created} time entries`)
    },
    onError: () => toast.error('Failed to accept all'),
  })

  const syncMutation = useMutation({
    mutationFn: activityApi.triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      toast.success('Sync completed — new activities loaded')
    },
    onError: () => toast.error('Sync failed'),
  })

  const [showDebug, setShowDebug] = useState(false)
  const [debugDays, setDebugDays] = useState(7)
  const { data: debugInfo, refetch: refetchDebug, isFetching: debugLoading } = useQuery({
    queryKey: ['integrations', 'debug', 'graph', debugDays],
    queryFn: () => integrationsApi.getGraphDebug(debugDays),
    enabled: showDebug,
  })

  const cleanupAdoMutation = useMutation({
    mutationFn: activityApi.cleanupAdo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      toast.success(`Cleaned up ${data.deleted} pending ADO item(s) — sync now to reload correctly`)
    },
    onError: () => toast.error('Cleanup failed'),
  })

  const [adoDiscoverLog, setAdoDiscoverLog] = useState<string[] | null>(null)
  const discoverAdoMutation = useMutation({
    mutationFn: () => integrationsApi.discoverAdoOrgs(),
    onSuccess: (result) => {
      setAdoDiscoverLog(result.steps)
      if (result.success) {
        refetchDebug()
        toast.success(`Discovered ${result.organizations.length} org(s): ${result.organizations.join(', ')}`)
      } else {
        toast.error('Could not auto-discover organizations — see log below')
      }
    },
    onError: () => toast.error('Discovery request failed'),
  })

  const [adoQuickOrg, setAdoQuickOrg] = useState('')
  const updateAdoOrgsMutation = useMutation({
    mutationFn: ({ id, orgs }: { id: number; orgs: string }) =>
      integrationsApi.updateAdoOrganizations(id, orgs),
    onSuccess: () => {
      refetchDebug()
      setAdoQuickOrg('')
      toast.success('Organizations saved')
    },
    onError: () => toast.error('Failed to save organizations'),
  })

  const pendingWithSuggestions = events.filter(
    e => e.suggestionState === 'Pending' && e.suggestedTaskId
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ActivityIcon className="h-6 w-6" /> Activity
          </h1>
          <p className="text-muted-foreground mt-1">
            Activity automatically captured from your connected integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing…' : 'Sync Now'}
          </Button>
          {pendingWithSuggestions.length > 0 && (
            <Button
              onClick={() => acceptAllMutation.mutate()}
              disabled={acceptAllMutation.isPending}
              className="gap-2"
            >
              {acceptAllMutation.isPending
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <CheckCheck className="h-4 w-4" />}
              Accept All ({pendingWithSuggestions.length})
            </Button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{summary.pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending suggestions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{summary.acceptedToday}</div>
              <div className="text-sm text-muted-foreground">Accepted today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{summary.dismissedToday}</div>
              <div className="text-sm text-muted-foreground">Dismissed today</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Dismissed">Dismissed</SelectItem>
            <SelectItem value="AutoCreated">Auto-created</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="OutlookCalendar">Outlook Calendar</SelectItem>
            <SelectItem value="TeamsMeeting">Teams Meeting</SelectItem>
            <SelectItem value="AzureDevOpsWorkItem">ADO Work Item</SelectItem>
            <SelectItem value="AzureDevOpsCommit">ADO Commit</SelectItem>
            <SelectItem value="AzureDevOpsPullRequest">ADO Pull Request</SelectItem>
            <SelectItem value="GitHubCommit">GitHub Commit</SelectItem>
            <SelectItem value="GitHubPullRequest">GitHub PR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {stateFilter === 'Pending' ? 'Pending Suggestions' : stateFilter === 'all' ? 'All Activity' : `${stateFilter} Activity`}
          </CardTitle>
          {stateFilter === 'Pending' && (
            <CardDescription>Review and accept activity to create time entries automatically</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading activity…
            </div>
          ) : events.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {stateFilter === 'Pending'
                ? 'No pending suggestions. Connect integrations in Settings to start tracking activity.'
                : 'No activity found for these filters.'}
            </div>
          ) : (
            events.map(event => (
              <ActivityEventCard
                key={event.id}
                event={event}
                tasks={tasks}
                onAccept={(id, overrides) => acceptMutation.mutate({ id, overrides })}
                onDismiss={(id) => dismissMutation.mutate({ id })}
                acceptingId={acceptingId}
                dismissingId={dismissingId}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Raw Data Debug Panel */}
      <Card>
        <CardHeader
          className="pb-2 cursor-pointer select-none"
          onClick={() => setShowDebug(!showDebug)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" /> Integration Debug
            </CardTitle>
            <div className="flex items-center gap-2">
              {debugInfo && (
                <>
                  <Badge variant={debugInfo.isConnected ? 'secondary' : 'destructive'} className="text-xs">
                    Graph: {debugInfo.isConnected ? `${debugInfo.eventsFound} events` : 'Not connected'}
                  </Badge>
                  <Badge variant={debugInfo.adoConnected ? 'secondary' : 'outline'} className="text-xs">
                    ADO: {debugInfo.adoConnected ? 'Connected' : 'Not connected'}
                  </Badge>
                </>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  showDebug ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
          <CardDescription className="text-xs">
            Inspect what Microsoft Graph and Azure DevOps return for debugging
          </CardDescription>
        </CardHeader>
        {showDebug && (
          <CardContent className="space-y-3">
            {/* Day range slider */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground shrink-0">Look back:</span>
              <input
                type="range"
                min={1}
                max={30}
                value={debugDays}
                onChange={e => setDebugDays(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 shrink-0">
                {debugDays} day{debugDays !== 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchDebug()}
                disabled={debugLoading}
                className="shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${debugLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {debugLoading && !debugInfo && (
              <div className="text-sm text-muted-foreground text-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                Fetching from Graph…
              </div>
            )}

            {debugInfo && (
              <>
                {/* Diagnostics row */}
                {(debugInfo.diagUserId || debugInfo.diagFilterNote) && (
                  <div className="rounded border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-2 text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                    <div className="font-medium">Server diagnostics</div>
                    {debugInfo.diagUserId && <div>User ID: {debugInfo.diagUserId} · Workspace ID: {debugInfo.diagWorkspaceId ?? '?'}</div>}
                    {debugInfo.diagFilterNote && <div className="text-orange-600 dark:text-orange-400">⚠ {debugInfo.diagFilterNote}</div>}
                  </div>
                )}

                {/* Token status */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2">
                    <span className="text-muted-foreground">Graph token expires:</span>{' '}
                    <span>
                      {debugInfo.tokenExpiresAt
                        ? new Date(debugInfo.tokenExpiresAt).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="rounded border p-2">
                    <span className="text-muted-foreground">Refresh available:</span>{' '}
                    <span className={debugInfo.tokenRefreshAvailable ? 'text-green-600' : 'text-red-500'}>
                      {debugInfo.tokenRefreshAvailable ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>

                {/* ADO status */}
                <div className="rounded border p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground">Azure DevOps:</span>{' '}
                      <span className={debugInfo.adoConnected ? 'text-green-600' : 'text-muted-foreground'}>
                        {debugInfo.adoConnected ? '✓ Connected' : '✗ Not connected'}
                      </span>
                      {debugInfo.adoConnected && (
                        <span className={`ml-2 font-mono ${debugInfo.adoOrgConfigured ? 'text-green-700 dark:text-green-400' : 'text-amber-600'}`}>
                          {debugInfo.adoOrgConfigured ? `orgs: ${debugInfo.adoOrganization}` : '⚠ No organizations stored'}
                        </span>
                      )}
                      {debugInfo.adoConnected && debugInfo.adoEnabledSources.length > 0 && (
                        <span className="text-muted-foreground ml-2">· {debugInfo.adoEnabledSources.join(', ')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {debugInfo.adoLastSyncedAt && (
                        <span className="text-muted-foreground">Last sync: {new Date(debugInfo.adoLastSyncedAt).toLocaleString()}</span>
                      )}
                      {debugInfo.adoConnected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2"
                          onClick={() => { setAdoDiscoverLog(null); discoverAdoMutation.mutate() }}
                          disabled={discoverAdoMutation.isPending}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${discoverAdoMutation.isPending ? 'animate-spin' : ''}`} />
                          Force discover
                        </Button>
                      )}
                    </div>
                  </div>
                  {adoDiscoverLog && (
                    <div className="mt-1 rounded bg-muted p-2 font-mono text-xs space-y-0.5 max-h-40 overflow-auto">
                      {adoDiscoverLog.map((line, i) => (
                        <div key={i} className={
                          line.includes('⚠') ? 'text-amber-600' :
                          line.includes('✓') ? 'text-green-600' :
                          line.startsWith('→') ? 'text-blue-600 dark:text-blue-400' :
                          'text-muted-foreground'
                        }>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                  {debugInfo.adoConnected && debugInfo.adoIntegrationId && (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={adoQuickOrg}
                        onChange={e => setAdoQuickOrg(e.target.value)}
                        placeholder="Set orgs manually, e.g. mycompany, otherorg"
                        className="flex-1 h-7 rounded border bg-background px-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && adoQuickOrg.trim()) {
                            updateAdoOrgsMutation.mutate({ id: debugInfo.adoIntegrationId!, orgs: adoQuickOrg.trim() })
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 shrink-0"
                        disabled={!adoQuickOrg.trim() || updateAdoOrgsMutation.isPending}
                        onClick={() => updateAdoOrgsMutation.mutate({ id: debugInfo.adoIntegrationId!, orgs: adoQuickOrg.trim() })}
                      >
                        Save orgs
                      </Button>
                    </div>
                  )}
                  {debugInfo.adoConnected && (
                    <div className="mt-1 flex items-center justify-between gap-2 rounded border border-red-200 bg-red-50 dark:bg-red-950/20 px-2 py-1">
                      <span className="text-xs text-red-700 dark:text-red-400">
                        Delete all pending ADO items and re-sync with the fixed filters
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 text-xs px-2 shrink-0"
                        disabled={cleanupAdoMutation.isPending || syncMutation.isPending}
                        onClick={() => {
                          if (confirm('Delete all pending ADO suggestions and re-sync? This cannot be undone.')) {
                            cleanupAdoMutation.mutate(undefined, {
                              onSuccess: () => syncMutation.mutate()
                            })
                          }
                        }}
                      >
                        {cleanupAdoMutation.isPending || syncMutation.isPending
                          ? <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                          : null}
                        Clean up &amp; re-sync
                      </Button>
                    </div>
                  )}
                </div>

                {debugInfo.lastError && (
                  <div className="rounded border border-red-200 bg-red-50 dark:bg-red-950/20 p-2 text-xs text-red-700 dark:text-red-400">
                    <strong>Error:</strong> {debugInfo.lastError}
                  </div>
                )}

                {/* Raw events */}
                {debugInfo.events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No events returned from Graph in this period.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-auto">
                    {debugInfo.events.map(e => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded border p-2 text-xs gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{e.subject}</span>
                          <span className="text-muted-foreground">
                            {new Date(e.startUtc).toLocaleString()} · {e.durationMinutes}m
                            {e.isOnlineMeeting && ' · 🎥 Online'}
                            {e.organizerEmail && ` · ${e.organizerEmail}`}
                          </span>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {e.attendeeCount} attendee{e.attendeeCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
