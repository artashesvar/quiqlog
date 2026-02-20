'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { copyToClipboard } from '@/lib/utils'
import { APP_URL } from '@/lib/constants'
import type { Guide } from '@/lib/types'

interface GuideHeaderProps {
  guide: Guide
  onUpdate: (updates: Partial<Guide>) => Promise<void>
}

export default function GuideHeader({ guide, onUpdate }: GuideHeaderProps) {
  const [title, setTitle] = useState(guide.title)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${APP_URL}/guide/${guide.slug}`

  async function handleTitleBlur() {
    if (title === guide.title) return
    setSaving(true)
    await onUpdate({ title })
    setSaving(false)
  }

  async function handlePublishToggle() {
    await onUpdate({ is_public: !guide.is_public })
  }

  async function handleCopyLink() {
    await copyToClipboard(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Back link */}
      <Link href="/dashboard" className="text-text-muted hover:text-text-secondary text-sm transition-colors w-fit">
        ← Back to Dashboard
      </Link>

      <div className="flex items-start gap-3">
        {/* Editable title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="flex-1 font-heading font-semibold text-2xl text-text-primary bg-transparent border-none outline-none focus:ring-0 placeholder:text-text-muted"
          placeholder="Guide title..."
        />
        {saving && <span className="text-xs text-text-muted mt-2">Saving...</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={guide.is_public ? 'success' : 'default'}>
          {guide.is_public ? 'Public' : 'Draft'}
        </Badge>

        <Button
          variant="secondary"
          size="sm"
          onClick={handlePublishToggle}
        >
          {guide.is_public ? 'Unpublish' : 'Publish'}
        </Button>

        {guide.is_public && (
          <>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              {copied ? '✓ Link Copied' : 'Copy Share Link'}
            </Button>
            <a href={shareUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                View Public Guide ↗
              </Button>
            </a>
          </>
        )}
      </div>
    </div>
  )
}
