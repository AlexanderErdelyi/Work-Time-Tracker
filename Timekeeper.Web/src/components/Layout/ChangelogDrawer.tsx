import { useEffect, useState } from 'react'
import { X, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { type Release, useChangelog } from '../../hooks/useChangelog'

interface Props {
  open: boolean
  onClose: () => void
}

const CATEGORY_CONFIG = {
  added:   { label: 'Added',   color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  changed: { label: 'Changed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  fixed:   { label: 'Fixed',   color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  removed: { label: 'Removed', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
} as const

function ReleaseCard({ release, defaultOpen }: { release: Release; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const hasContent = (Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>)
    .some(k => release.changes[k].length > 0)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
            v{release.version}
          </Badge>
          {release.title && (
            <span className="text-sm font-medium truncate">{release.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs text-muted-foreground">{release.date}</span>
          {hasContent && (
            expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {expanded && hasContent && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {(Object.entries(CATEGORY_CONFIG) as Array<[keyof typeof CATEGORY_CONFIG, (typeof CATEGORY_CONFIG)[keyof typeof CATEGORY_CONFIG]]>)
            .map(([key, cfg]) => {
              const items = release.changes[key]
              if (items.length === 0) return null
              return (
                <div key={key}>
                  <span className={cn('inline-block text-xs font-semibold px-2 py-0.5 rounded mb-2', cfg.color)}>
                    {cfg.label}
                  </span>
                  <ul className="space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export function ChangelogDrawer({ open, onClose }: Props) {
  const { releases, currentVersion, markAsSeen, loading } = useChangelog()

  // Mark as seen immediately when drawer opens
  useEffect(() => {
    if (open) {
      markAsSeen()
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out sm:w-[480px]',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold">What's New</h2>
              {currentVersion && (
                <p className="text-xs text-muted-foreground">Latest: v{currentVersion}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading release notes…
            </div>
          )}
          {!loading && releases.length === 0 && (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              No release notes available.
            </div>
          )}
          {!loading && releases.map((release, i) => (
            <ReleaseCard key={release.version} release={release} defaultOpen={i === 0} />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex-shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            Timekeeper release history • All times are UTC
          </p>
        </div>
      </div>
    </>
  )
}
