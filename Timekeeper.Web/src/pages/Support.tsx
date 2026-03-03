import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import TurndownService from 'turndown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Badge } from '../components/ui/Badge'
import { supportApi } from '../api'
import { useWorkspaceContext } from '../hooks/useWorkspaceContext'
import type { CreateSupportIssueResponse } from '../types'
import {
  AlertCircle,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  List,
  ListOrdered,
  MessageSquare,
  Pencil,
  PlusCircle,
  Trash2,
} from 'lucide-react'

const APP_VERSION =
  (typeof import.meta !== 'undefined' ? (import.meta as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION : undefined)
  || localStorage.getItem('timekeeper_appVersion')
  || 'web'

function detectOperatingSystem(userAgent: string) {
  if (/Windows/i.test(userAgent)) return 'Windows'
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
  if (/Linux/i.test(userAgent)) return 'Linux'
  return 'Unknown'
}

function formatDate(value?: string) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function getTicketStateLabel(state: string) {
  return state.toLowerCase() === 'closed' ? 'Completed' : 'Open'
}

function getGitHubLabelStyle(color?: string): CSSProperties | undefined {
  if (!color) {
    return undefined
  }

  const normalized = color.startsWith('#') ? color : `#${color}`
  return {
    backgroundColor: `${normalized}22`,
    borderColor: `${normalized}66`,
    color: normalized,
  }
}

/**
 * Converts a relative URL returned by the API to an absolute URL using the current origin.
 * Ensures images resolve correctly regardless of where the frontend is served.
 */
function toAbsoluteUrl(url: string): string {
  // Already an absolute URL (http://, https://) or protocol-relative (//)
  // Note: The API always returns relative paths like /api/support/images/{fileName},
  // but we handle other cases for robustness and future-proofing
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url
  }
  // Ensure the URL starts with a forward slash for proper concatenation
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  return `${window.location.origin}${normalizedUrl}`
}

export function Support() {
  const queryClient = useQueryClient()
  const { data: workspaceContext } = useWorkspaceContext()

  const [activeView, setActiveView] = useState<'create' | 'tickets'>('create')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('bug')
  const [severity, setSeverity] = useState('medium')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [browser, setBrowser] = useState(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const [operatingSystem, setOperatingSystem] = useState(
    typeof navigator !== 'undefined' ? detectOperatingSystem(navigator.userAgent) : 'Unknown'
  )
  const [appVersion, setAppVersion] = useState(APP_VERSION)
  const [contactEmail, setContactEmail] = useState('')
  const [createdIssue, setCreatedIssue] = useState<CreateSupportIssueResponse | null>(null)
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null)
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'closed'>('open')

  const imageInputId = 'support-editor-image-upload'
  const commentImageInputId = 'support-comment-editor-image-upload'

  useEffect(() => {
    if (!contactEmail && workspaceContext?.currentUser.email) {
      setContactEmail(workspaceContext.currentUser.email)
    }
  }, [contactEmail, workspaceContext?.currentUser.email])

  const issueOwner = workspaceContext?.workspace.gitHubIssueOwner?.trim()
  const issueRepo = workspaceContext?.workspace.gitHubIssueRepo?.trim()
  const supportTargetConfigured = Boolean(issueOwner && issueRepo)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Describe the issue in detail. Use "- " for bullet list and "1. " for numbered list.',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[180px] p-3 text-sm focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p]:my-1',
      },
    },
  })

  const commentEditor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Write a reply that will be posted to GitHub...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[140px] p-3 text-sm focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p]:my-1',
      },
    },
  })

  const markdownConverter = useMemo(() => {
    return new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    })
  }, [])

  const unreadQuery = useQuery({
    queryKey: ['support', 'unread-count'],
    queryFn: supportApi.getUnreadCount,
    refetchInterval: 20000,
    enabled: supportTargetConfigured,
  })

  const ticketsQuery = useQuery({
    queryKey: ['support', 'my-issues'],
    queryFn: supportApi.getMyIssues,
    refetchInterval: 20000,
    enabled: supportTargetConfigured,
  })

  const tickets = ticketsQuery.data ?? []
  const filteredTickets = useMemo(() => {
    if (ticketFilter === 'all') {
      return tickets
    }
    return tickets.filter((ticket) =>
      ticketFilter === 'open' ? ticket.state.toLowerCase() !== 'closed' : ticket.state.toLowerCase() === 'closed'
    )
  }, [ticketFilter, tickets])

  // Single effect: auto-select first visible ticket when nothing is selected,
  // or when the current selection is hidden by the active filter.
  useEffect(() => {
    if (!selectedIssueNumber) {
      if (filteredTickets.length > 0) {
        setSelectedIssueNumber(filteredTickets[0].issueNumber)
      }
      return
    }
    if (!filteredTickets.some((ticket) => ticket.issueNumber === selectedIssueNumber)) {
      setSelectedIssueNumber(filteredTickets[0]?.issueNumber ?? null)
    }
  }, [filteredTickets, selectedIssueNumber])

  const detailQuery = useQuery({
    queryKey: ['support', 'issue-detail', selectedIssueNumber],
    queryFn: () => supportApi.getIssueDetail(selectedIssueNumber ?? 0),
    enabled: supportTargetConfigured && activeView === 'tickets' && !!selectedIssueNumber,
    refetchInterval: selectedIssueNumber && activeView === 'tickets' ? 20000 : false,
  })

  const markReadMutation = useMutation({
    mutationFn: (issueNumber: number) => supportApi.markIssueAsRead(issueNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] })
      queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] })
    },
  })

  const closeIssueMutation = useMutation({
    mutationFn: (issueNumber: number) => supportApi.closeIssue(issueNumber),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['support', 'issue-detail', selectedIssueNumber] }),
        queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] }),
      ])
    },
  })

  const deleteIssueMutation = useMutation({
    mutationFn: (issueNumber: number) => supportApi.deleteIssue(issueNumber),
    onSuccess: async (_data, issueNumber) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] }),
      ])

      if (selectedIssueNumber === issueNumber) {
        setSelectedIssueNumber(null)
      }
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (payload: { issueNumber: number; body: string }) => supportApi.addIssueComment(payload.issueNumber, payload.body),
    onSuccess: async () => {
      commentEditor?.commands.clearContent()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['support', 'issue-detail', selectedIssueNumber] }),
        queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] }),
      ])
      if (selectedIssueNumber) {
        markReadMutation.mutate(selectedIssueNumber)
      }
    },
  })

  const createIssueMutation = useMutation({
    mutationFn: supportApi.createIssue,
    onSuccess: async (result) => {
      setCreatedIssue(result)
      setTitle('')
      editor?.commands.clearContent()
      setStepsToReproduce('')
      setExpectedBehavior('')
      setActualBehavior('')
      setActiveView('tickets')
      setSelectedIssueNumber(result.issueNumber)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] }),
        queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] }),
      ])

      markReadMutation.mutate(result.issueNumber)
      alert(`Support issue #${result.issueNumber} created successfully.`)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not create support issue.'
      alert(message)
    },
  })

  const handleSubmit = () => {
    const currentDescriptionText = editor?.getText().trim() ?? ''
    const currentDescriptionMarkdown = markdownConverter
      .turndown(editor?.getHTML() ?? '')
      .trim()

    if (!title.trim() || !currentDescriptionText) {
      alert('Please provide a title and description.')
      return
    }

    createIssueMutation.mutate({
      title,
      category,
      severity,
      description: currentDescriptionMarkdown,
      stepsToReproduce: stepsToReproduce.trim() || undefined,
      expectedBehavior: expectedBehavior.trim() || undefined,
      actualBehavior: actualBehavior.trim() || undefined,
      browser: browser.trim() || undefined,
      operatingSystem: operatingSystem.trim() || undefined,
      appVersion: appVersion.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
    })
  }

  const handleImageUpload = async (file: File) => {
    const result = await supportApi.uploadImage(file)
    editor?.chain().focus().setImage({ src: toAbsoluteUrl(result.url) }).run()
  }

  const handleCommentImageUpload = async (file: File) => {
    const result = await supportApi.uploadImage(file)
    commentEditor?.chain().focus().setImage({ src: toAbsoluteUrl(result.url) }).run()
  }

  const handlePasteImage = async (
    event: React.ClipboardEvent,
    upload: (file: File) => Promise<void>
  ) => {
    const items = event.clipboardData?.items
    if (!items) {
      return
    }

    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
    if (!imageItem) {
      return
    }

    const file = imageItem.getAsFile()
    if (!file) {
      return
    }

    event.preventDefault()

    try {
      await upload(file)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not paste image.'
      alert(message)
    }
  }

  const handleSelectTicket = async (issueNumber: number) => {
    setSelectedIssueNumber(issueNumber)

    // Check if the ticket currently has unread updates before updating
    const currentTickets = queryClient.getQueryData<typeof ticketsQuery.data>(['support', 'my-issues'])
    const selectedTicket = currentTickets?.find((t) => t.issueNumber === issueNumber)
    const wasUnread = selectedTicket?.hasUnreadUpdates ?? false

    // Optimistically update the ticket's hasUnreadUpdates flag
    queryClient.setQueryData(['support', 'my-issues'], (existing: typeof ticketsQuery.data) =>
      (existing ?? []).map((ticket) =>
        ticket.issueNumber === issueNumber
          ? { ...ticket, hasUnreadUpdates: false }
          : ticket
      )
    )

    // Optimistically decrement the unread counter if the ticket was unread
    if (wasUnread) {
      queryClient.setQueryData(['support', 'unread-count'], (existing: typeof unreadQuery.data) => {
        if (!existing) return existing
        return {
          ...existing,
          unreadCount: Math.max(0, existing.unreadCount - 1),
        }
      })
    }

    markReadMutation.mutate(issueNumber)
  }

  const unreadCount = unreadQuery.data?.unreadCount ?? 0

  useEffect(() => {
    if (!detailQuery.isError || !selectedIssueNumber) {
      return
    }

    const message = detailQuery.error instanceof Error ? detailQuery.error.message.toLowerCase() : ''
    if (message.includes('no longer exists') || message.includes('not found')) {
      setSelectedIssueNumber(null)
      queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] })
      queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] })
    }
  }, [detailQuery.error, detailQuery.isError, queryClient, selectedIssueNumber])

  const selectedTicket = detailQuery.data?.ticket

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">Create tickets, track GitHub updates, and reply from here.</p>
      </div>

      {!supportTargetConfigured && (
        <Card className="border-amber-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Support repository is not configured for this workspace.</p>
                <p>Ask a workspace admin to set GitHub owner and repository in Settings.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="inline-flex rounded-md border bg-muted p-1">
        <Button
          variant={activeView === 'create' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('create')}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Create Ticket
        </Button>
        <Button
          variant={activeView === 'tickets' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('tickets')}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          My Tickets
          {unreadCount > 0 && <Badge className="ml-1 min-w-5 justify-center px-1.5 py-0">{unreadCount}</Badge>}
        </Button>
      </div>

      {activeView === 'create' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              <CardTitle>Create Support Ticket</CardTitle>
            </div>
            <CardDescription>
              Target repository: {supportTargetConfigured ? `${issueOwner}/${issueRepo}` : 'Not configured'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supportTitle">Title *</Label>
                <Input
                  id="supportTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary of the problem"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportCategory">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="supportCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportSeverity">Severity *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger id="supportSeverity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Description *</Label>
                <div
                  className="border rounded-md overflow-hidden"
                  onPaste={(event) => {
                    void handlePasteImage(event, handleImageUpload)
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b p-2 bg-muted/40">
                    <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>
                      B
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                      I
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                      <List className="h-4 w-4 mr-1" />
                      Bullet
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                      <ListOrdered className="h-4 w-4 mr-1" />
                      Numbered
                    </Button>
                    <Label htmlFor={imageInputId} className="inline-flex cursor-pointer border border-input rounded-md h-9 px-3 items-center text-sm hover:bg-accent hover:text-accent-foreground">
                      <ImagePlus className="h-4 w-4 mr-1" />
                      Image
                    </Label>
                    <input
                      id={imageInputId}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) {
                          return
                        }

                        try {
                          await handleImageUpload(file)
                        } catch (error) {
                          const message = error instanceof Error ? error.message : 'Could not upload image.'
                          alert(message)
                        } finally {
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                  <EditorContent editor={editor} />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supportSteps">Steps to Reproduce (optional)</Label>
                <Textarea
                  id="supportSteps"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  rows={4}
                  placeholder="1) ... 2) ... 3) ..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportExpected">Expected Behavior (optional)</Label>
                <Textarea
                  id="supportExpected"
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  rows={3}
                  placeholder="What did you expect to happen?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportActual">Actual Behavior (optional)</Label>
                <Textarea
                  id="supportActual"
                  value={actualBehavior}
                  onChange={(e) => setActualBehavior(e.target.value)}
                  rows={3}
                  placeholder="What actually happened?"
                />
              </div>

              <div className="md:col-span-2 border rounded-md">
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm"
                  onClick={() => setShowAdvanced((current) => !current)}
                >
                  {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Advanced Technical Details
                </button>

                {showAdvanced && (
                  <div className="border-t p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supportBrowser">Browser / User Agent</Label>
                      <Input
                        id="supportBrowser"
                        value={browser}
                        onChange={(e) => setBrowser(e.target.value)}
                        placeholder="Browser and version"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supportOS">Operating System</Label>
                      <Input
                        id="supportOS"
                        value={operatingSystem}
                        onChange={(e) => setOperatingSystem(e.target.value)}
                        placeholder="OS and version"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supportAppVersion">App Version</Label>
                      <Input
                        id="supportAppVersion"
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        placeholder="v1.0.0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supportContactEmail">Contact Email (optional)</Label>
                      <Input
                        id="supportContactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSubmit}
                disabled={createIssueMutation.isPending || !supportTargetConfigured}
                className="gap-2"
              >
                {createIssueMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
              </Button>

              {createdIssue && (
                <a
                  href={createdIssue.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View Issue #{createdIssue.issueNumber}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>My Tickets</CardTitle>
                  <CardDescription>Newest activity first</CardDescription>
                </div>
                <div className="inline-flex rounded-md border bg-muted p-1">
                  <Button variant={ticketFilter === 'open' ? 'default' : 'ghost'} size="sm" onClick={() => setTicketFilter('open')}>
                    Open
                  </Button>
                  <Button variant={ticketFilter === 'closed' ? 'default' : 'ghost'} size="sm" onClick={() => setTicketFilter('closed')}>
                    Completed
                  </Button>
                  <Button variant={ticketFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTicketFilter('all')}>
                    All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!supportTargetConfigured && <p className="text-sm text-muted-foreground">Support repository is not configured.</p>}
              {supportTargetConfigured && ticketsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tickets...</p>}
              {supportTargetConfigured && !ticketsQuery.isLoading && filteredTickets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {tickets.length === 0
                    ? 'No tickets found yet.'
                    : ticketFilter === 'open'
                      ? 'No open tickets.'
                      : 'No completed tickets.'}
                </p>
              )}

              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.issueNumber}
                  type="button"
                  className={`w-full text-left rounded-md border p-3 space-y-2 hover:border-primary ${selectedIssueNumber === ticket.issueNumber ? 'border-primary' : ''}`}
                  onClick={() => handleSelectTicket(ticket.issueNumber)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">#{ticket.issueNumber} {ticket.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {ticket.labels.map((label) => (
                          <Badge key={`${ticket.issueNumber}-${label.name}`} variant="outline" style={getGitHubLabelStyle(label.color)}>
                            {label.name}
                          </Badge>
                        ))}
                        <Badge variant="secondary">{getTicketStateLabel(ticket.state)}</Badge>
                      </div>
                    </div>
                    {ticket.hasUnreadUpdates && <Badge>New</Badge>}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Updated: {formatDate(ticket.lastIssueUpdatedAt || ticket.createdAt)}</p>
                    <p>Last comment: {formatDate(ticket.lastCommentAt)}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                {selectedIssueNumber ? `Issue #${selectedIssueNumber}` : 'Select a ticket'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailQuery.isLoading && <p className="text-sm text-muted-foreground">Loading conversation...</p>}
              {detailQuery.isError && <p className="text-sm text-destructive">Could not load ticket detail.</p>}

              {!detailQuery.isLoading && !detailQuery.isError && (
                <>
                  {detailQuery.data?.ticket && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">#{detailQuery.data.ticket.issueNumber} {detailQuery.data.ticket.title}</p>
                        <Badge variant="secondary">{getTicketStateLabel(detailQuery.data.ticket.state)}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {detailQuery.data.ticket.labels.map((label) => (
                          <Badge key={`detail-${label.name}`} variant="outline" style={getGitHubLabelStyle(label.color)}>
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          disabled={closeIssueMutation.isPending || detailQuery.data.ticket.state.toLowerCase() === 'closed'}
                          onClick={() => {
                            closeIssueMutation.mutate(detailQuery.data!.ticket.issueNumber)
                          }}
                        >
                          <Check className="h-4 w-4" />
                          Close
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={deleteIssueMutation.isPending}
                          onClick={() => {
                            if (!selectedTicket) {
                              return
                            }

                            if (!confirm(`Delete ticket #${selectedTicket.issueNumber} from this app?`)) {
                              return
                            }

                            deleteIssueMutation.mutate(selectedTicket.issueNumber)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}

                  {(detailQuery.data?.comments.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No content yet.</p>
                  ) : (
                    detailQuery.data?.comments.map((comment, index) => (
                      <div key={`${comment.createdAt}-${index}`} className="rounded-md border p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{comment.author}</p>
                          {comment.isResponseFromOthers && <Badge variant="secondary">GitHub</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(comment.updatedAt || comment.createdAt)}</p>
                        <div className="text-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: comment.body }} />
                      </div>
                    ))
                  )}

                  {selectedIssueNumber && (
                    <div className="pt-2 space-y-2">
                      <Label htmlFor="support-new-comment" className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Add comment
                      </Label>
                      <div
                        className="border rounded-md overflow-hidden"
                        onPaste={(event) => {
                          void handlePasteImage(event, handleCommentImageUpload)
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2 border-b p-2 bg-muted/40">
                          <Button type="button" variant="outline" size="sm" onClick={() => commentEditor?.chain().focus().toggleBold().run()}>
                            B
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => commentEditor?.chain().focus().toggleItalic().run()}>
                            I
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => commentEditor?.chain().focus().toggleBulletList().run()}>
                            <List className="h-4 w-4 mr-1" />
                            Bullet
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => commentEditor?.chain().focus().toggleOrderedList().run()}>
                            <ListOrdered className="h-4 w-4 mr-1" />
                            Numbered
                          </Button>
                          <Label htmlFor={commentImageInputId} className="inline-flex cursor-pointer border border-input rounded-md h-9 px-3 items-center text-sm hover:bg-accent hover:text-accent-foreground">
                            <ImagePlus className="h-4 w-4 mr-1" />
                            Image
                          </Label>
                          <input
                            id={commentImageInputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) {
                                return
                              }

                              try {
                                await handleCommentImageUpload(file)
                              } catch (error) {
                                const message = error instanceof Error ? error.message : 'Could not upload image.'
                                alert(message)
                              } finally {
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                        </div>
                        <EditorContent editor={commentEditor} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const currentCommentText = commentEditor?.getText().trim() ?? ''
                            if (!selectedIssueNumber || !currentCommentText) {
                              return
                            }

                            addCommentMutation.mutate({
                              issueNumber: selectedIssueNumber,
                              body: markdownConverter.turndown(commentEditor?.getHTML() ?? '').trim(),
                            })
                          }}
                          disabled={addCommentMutation.isPending}
                          className="gap-2"
                        >
                          {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                        </Button>
                        {detailQuery.data?.ticket.issueUrl && (
                          <a
                            href={detailQuery.data.ticket.issueUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Open on GitHub
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
