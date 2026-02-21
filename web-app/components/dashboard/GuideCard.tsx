'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRelativeDate, copyToClipboard } from '@/lib/utils'
import { APP_URL } from '@/lib/constants'
import type { Guide } from '@/lib/types'

interface GuideCardProps {
  guide: Guide & { step_count: number }
}

export default function GuideCard({ guide }: GuideCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${APP_URL}/guide/${guide.slug}`

  async function handleDelete() {
    if (!confirm('Delete this guide? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/guides/${guide.id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleCopyLink() {
    await copyToClipboard(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card hoverable animate className="p-4 flex flex-col gap-3">
      {/* Title + public badge */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/guides/${guide.id}/editor`}
          className="font-heading font-semibold text-base text-text-primary hover:text-accent transition-colors line-clamp-2"
        >
          {guide.title}
        </Link>
        <Badge variant={guide.is_public ? 'success' : 'default'} className="flex-shrink-0">
          {guide.is_public ? 'Public' : 'Draft'}
        </Badge>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>{guide.step_count} step{guide.step_count !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{formatRelativeDate(guide.created_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <Link href={`/dashboard/guides/${guide.id}/editor`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Edit
          </Button>
        </Link>

        {guide.is_public && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={handleCopyLink}
          >
            {copied ? '✓ Copied' : 'Copy Link'}
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          className="text-xs"
          onClick={handleDelete}
          loading={deleting}
        >
          Delete
        </Button>
      </div>
    </Card>
  )
}
