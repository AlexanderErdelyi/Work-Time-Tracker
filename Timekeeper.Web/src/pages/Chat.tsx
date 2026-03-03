import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, Send, Trash2, Loader2, AlertTriangle, WifiOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { aiApi } from '../api/ai'
import { cn } from '../lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const lines = message.content.split('\n')

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
        {message.streaming && (
          <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 rounded-sm animate-pulse" />
        )}
      </div>
    </div>
  )
}

const STORAGE_KEY = 'timekeeper_ai_messages'

function loadPersistedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: Message[] = JSON.parse(raw)
    // Clear any streaming flag that was left mid-flight on a previous session
    return parsed.map(m => ({ ...m, streaming: false }))
  } catch {
    return []
  }
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(loadPersistedMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Persist messages to localStorage whenever they change (skip mid-stream saves)
  useEffect(() => {
    if (isLoading) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // storage quota exceeded — ignore
    }
  }, [messages, isLoading])

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: aiApi.getStatus,
    staleTime: 30_000,
  })

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', streaming: true }])

    abortRef.current = new AbortController()

    try {
      // We call fetchApiResponse via aiApi but need abort signal — call fetch directly
      const stored_email = localStorage.getItem('timekeeper_authUserEmail')?.trim()
        || localStorage.getItem('timekeeper_userEmail')?.trim()
        || 'admin@local.timekeeper'
      const stored_ws = localStorage.getItem('timekeeper_authWorkspaceId')?.trim() || '1'
      const stored_role = localStorage.getItem('timekeeper_authRole')?.trim()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Timekeeper-User': stored_email,
        'X-Timekeeper-Workspace': stored_ws,
      }
      if (stored_role) headers['X-Timekeeper-Role'] = stored_role

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''  // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice('data: '.length)
          if (data === '[DONE]') break

          // Unescape \\n back to real newlines
          const chunk = data.replace(/\\n/g, '\n')

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk, streaming: true }
                : m
            )
          )
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: errorMsg, streaming: false }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
      // Remove streaming flag
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
      )
      inputRef.current?.focus()
    }
  }, [input, isLoading])

  const clearConversation = async () => {
    abortRef.current?.abort()
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    await aiApi.clearSession()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Disabled / loading states ─────────────────────────────────

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status?.enabled) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">AI Assistant is not enabled</p>
              <p className="text-sm text-muted-foreground mt-1">
                An admin needs to enable the AI Assistant and configure a GitHub token in
                Settings → AI Assistant.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Main chat UI ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Assistant</h1>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearConversation} className="gap-2 text-muted-foreground">
            <Trash2 className="h-4 w-4" />
            Clear conversation
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium text-base">How can I help you today?</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Ask me to log time, summarize your day, start a timer, or answer questions about your entries.
              </p>
            </div>
            <div className="grid gap-2 mt-2 w-full max-w-md">
              {[
                'What did I work on today?',
                'Log 2 hours on the Acme project yesterday',
                'How many hours this week?',
                'Start a timer for the weekly report',
              ].map(example => (
                <button
                  key={example}
                  onClick={() => { setInput(example); inputRef.current?.focus() }}
                  className="text-left text-sm px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your time entries..."
            rows={1}
            disabled={isLoading}
            className={cn(
              'flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:opacity-50 min-h-[42px] max-h-[200px]',
              'scrollbar-thin'
            )}
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 200) + 'px'
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-xl flex-shrink-0 h-[42px] w-[42px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
