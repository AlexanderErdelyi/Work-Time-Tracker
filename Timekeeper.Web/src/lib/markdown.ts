function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatInlineMarkdown(value: string): string {
  let result = escapeHtml(value)

  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  return result
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r/g, '').split('\n')
  const html: string[] = []

  let inCodeBlock = false
  let listMode: 'ul' | 'ol' | null = null

  const closeListIfOpen = () => {
    if (listMode === 'ul') {
      html.push('</ul>')
    }
    if (listMode === 'ol') {
      html.push('</ol>')
    }
    listMode = null
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      closeListIfOpen()
      if (!inCodeBlock) {
        inCodeBlock = true
        html.push('<pre><code>')
      } else {
        inCodeBlock = false
        html.push('</code></pre>')
      }
      continue
    }

    if (inCodeBlock) {
      html.push(`${escapeHtml(line)}\n`)
      continue
    }

    if (trimmed.length === 0) {
      closeListIfOpen()
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      closeListIfOpen()
      const level = Math.min(3, heading[1].length)
      html.push(`<h${level}>${formatInlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const unorderedListItem = trimmed.match(/^[-*]\s+(.+)$/)
    if (unorderedListItem) {
      if (listMode !== 'ul') {
        closeListIfOpen()
        html.push('<ul>')
        listMode = 'ul'
      }
      html.push(`<li>${formatInlineMarkdown(unorderedListItem[1])}</li>`)
      continue
    }

    const orderedListItem = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedListItem) {
      if (listMode !== 'ol') {
        closeListIfOpen()
        html.push('<ol>')
        listMode = 'ol'
      }
      html.push(`<li>${formatInlineMarkdown(orderedListItem[1])}</li>`)
      continue
    }

    const quote = trimmed.match(/^>\s+(.+)$/)
    if (quote) {
      closeListIfOpen()
      html.push(`<blockquote>${formatInlineMarkdown(quote[1])}</blockquote>`)
      continue
    }

    closeListIfOpen()
    html.push(`<p>${formatInlineMarkdown(trimmed)}</p>`)
  }

  closeListIfOpen()

  if (inCodeBlock) {
    html.push('</code></pre>')
  }

  return html.join('\n')
}
