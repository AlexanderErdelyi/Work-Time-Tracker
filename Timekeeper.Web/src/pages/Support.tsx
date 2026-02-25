import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
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
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  List,
  ListOrdered,
  MessageSquare,
  Pencil,
  PlusCircle,
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
  const [commentText, setCommentText] = useState('')

  const imageInputId = 'support-editor-image-upload'

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

  const descriptionHtml = editor?.getHTML() ?? ''
  const plainDescription = useMemo(() => {
    if (!editor) {
      return ''
    }

    return editor.getText().trim()
  }, [editor, descriptionHtml])

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

  useEffect(() => {
    if (!selectedIssueNumber && (ticketsQuery.data?.length ?? 0) > 0) {
      setSelectedIssueNumber(ticketsQuery.data?.[0]?.issueNumber ?? null)
    }
  }, [selectedIssueNumber, ticketsQuery.data])

  const detailQuery = useQuery({
    queryKey: ['support', 'issue-detail', selectedIssueNumber],
    queryFn: () => supportApi.getIssueDetail(selectedIssueNumber ?? 0),
    enabled: supportTargetConfigured && !!selectedIssueNumber,
    refetchInterval: selectedIssueNumber ? 20000 : false,
  })

  const markReadMutation = useMutation({
    mutationFn: (issueNumber: number) => supportApi.markIssueAsRead(issueNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'my-issues'] })
      queryClient.invalidateQueries({ queryKey: ['support', 'unread-count'] })
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (payload: { issueNumber: number; body: string }) => supportApi.addIssueComment(payload.issueNumber, payload.body),
    onSuccess: async () => {
      setCommentText('')
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
    mutationFn: () =>
      supportApi.createIssue({
        title,
        category,
        severity,
        description: descriptionHtml.trim(),
        stepsToReproduce: stepsToReproduce.trim() || undefined,
        expectedBehavior: expectedBehavior.trim() || undefined,
        actualBehavior: actualBehavior.trim() || undefined,
        browser: browser.trim() || undefined,
        operatingSystem: operatingSystem.trim() || undefined,
        appVersion: appVersion.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
      }),
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
    if (!title.trim() || !plainDescription) {
      alert('Please provide a title and description.')
      return
    }

    createIssueMutation.mutate()
  }

  const handleImageUpload = async (file: File) => {
    const result = await supportApi.uploadImage(file)
    editor?.chain().focus().setImage({ src: result.url }).run()
  }

  const handleSelectTicket = async (issueNumber: number) => {
    setSelectedIssueNumber(issueNumber)
    const selectedTicket = ticketsQuery.data?.find((t) => t.issueNumber === issueNumber)
    if (selectedTicket?.hasUnreadUpdates) {
      markReadMutation.mutate(issueNumber)
    }
  }

  const tickets = ticketsQuery.data ?? []
  const unreadCount = unreadQuery.data?.unreadCount ?? 0

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
                <div className="border rounded-md overflow-hidden">
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
              <CardTitle>My Tickets</CardTitle>
              <CardDescription>Newest activity first</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!supportTargetConfigured && <p className="text-sm text-muted-foreground">Support repository is not configured.</p>}
              {supportTargetConfigured && ticketsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tickets...</p>}
              {supportTargetConfigured && !ticketsQuery.isLoading && tickets.length === 0 && (
                <p className="text-sm text-muted-foreground">No tickets found yet.</p>
              )}

              {tickets.map((ticket) => (
                <button
                  key={ticket.issueNumber}
                  type="button"
                  className={`w-full text-left rounded-md border p-3 space-y-2 hover:border-primary ${selectedIssueNumber === ticket.issueNumber ? 'border-primary' : ''}`}
                  onClick={() => handleSelectTicket(ticket.issueNumber)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">#{ticket.issueNumber} {ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.category} · {ticket.severity} · {ticket.state}</p>
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
                        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    ))
                  )}

                  {selectedIssueNumber && (
                    <div className="pt-2 space-y-2">
                      <Label htmlFor="support-new-comment" className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Add comment
                      </Label>
                      <Textarea
                        id="support-new-comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={4}
                        placeholder="Write a reply that will be posted to GitHub..."
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!selectedIssueNumber || !commentText.trim()) {
                              return
                            }
                            addCommentMutation.mutate({ issueNumber: selectedIssueNumber, body: commentText })
                          }}
                          disabled={addCommentMutation.isPending || !commentText.trim()}
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
