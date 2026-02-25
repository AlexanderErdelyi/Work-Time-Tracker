import { BookOpenText, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import { markdownToHtml } from '../lib/markdown'

type DocsSection = {
  slug: string
  title: string
  summary: string
  file: string
}

type DocsManifest = {
  version: string
  updatedAt: string
  sections: DocsSection[]
}

export function Documentation() {
  const [manifest, setManifest] = useState<DocsManifest | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [query, setQuery] = useState('')
  const [markdownContent, setMarkdownContent] = useState('')
  const [loadingManifest, setLoadingManifest] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadManifest = async () => {
      try {
        setLoadingManifest(true)
        setError(null)

        const response = await fetch('/docs/manifest.json')
        if (!response.ok) {
          throw new Error('Unable to load documentation manifest.')
        }

        const data = (await response.json()) as DocsManifest
        if (!mounted) return

        setManifest(data)
        if (data.sections.length > 0) {
          setSelectedSlug(data.sections[0].slug)
        }
      } catch (fetchError) {
        if (!mounted) return
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load documentation.'
        setError(message)
      } finally {
        if (mounted) {
          setLoadingManifest(false)
        }
      }
    }

    loadManifest()

    return () => {
      mounted = false
    }
  }, [])

  const filteredSections = useMemo(() => {
    if (!manifest) return []

    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return manifest.sections

    return manifest.sections.filter(section => {
      const haystack = `${section.title} ${section.summary}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [manifest, query])

  const selectedSection = useMemo(() => {
    if (!manifest) return null
    return manifest.sections.find(section => section.slug === selectedSlug) ?? null
  }, [manifest, selectedSlug])

  useEffect(() => {
    let mounted = true

    const loadSection = async () => {
      if (!selectedSection) {
        setMarkdownContent('')
        return
      }

      try {
        setLoadingDoc(true)
        setError(null)

        const response = await fetch(selectedSection.file)
        if (!response.ok) {
          throw new Error(`Unable to load "${selectedSection.title}".`)
        }

        const content = await response.text()
        if (!mounted) return

        setMarkdownContent(content)
      } catch (fetchError) {
        if (!mounted) return
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load selected document.'
        setError(message)
      } finally {
        if (mounted) {
          setLoadingDoc(false)
        }
      }
    }

    loadSection()

    return () => {
      mounted = false
    }
  }, [selectedSection])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">
          Product guides, how-to instructions, and troubleshooting in one place.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpenText className="h-5 w-5" />
              Docs Library
            </CardTitle>
            <CardDescription>Browse by topic or search a section.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search docs..."
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              {loadingManifest && <p className="text-sm text-muted-foreground">Loading documentation...</p>}

              {!loadingManifest && filteredSections.length === 0 && (
                <p className="text-sm text-muted-foreground">No sections match your search.</p>
              )}

              {filteredSections.map(section => (
                <Button
                  key={section.slug}
                  variant={section.slug === selectedSlug ? 'default' : 'outline'}
                  className={cn('w-full justify-start h-auto py-2 text-left')}
                  onClick={() => setSelectedSlug(section.slug)}
                >
                  <span className="block">
                    <span className="block font-medium">{section.title}</span>
                    <span className="block text-xs opacity-80 mt-1">{section.summary}</span>
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedSection?.title ?? 'Documentation'}</CardTitle>
            {manifest && (
              <CardDescription>
                Version {manifest.version} • Updated {manifest.updatedAt}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : loadingDoc ? (
              <p className="text-sm text-muted-foreground">Loading section...</p>
            ) : (
              <article
                className={cn(
                  'max-w-none space-y-3',
                  '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2',
                  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
                  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1',
                  '[&_p]:text-sm [&_p]:leading-6 [&_p]:text-foreground',
                  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1',
                  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1',
                  '[&_li]:text-sm [&_li]:leading-6',
                  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs',
                  '[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3',
                  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
                  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2'
                )}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(markdownContent) }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
