'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { formatRelativeDate, copyToClipboard } from '@/lib/utils'
import { APP_URL } from '@/lib/constants'
import type { Guide } from '@/lib/types'

interface GuideCardProps {
  guide: Guide & { step_count: number }
  onDelete: (id: string) => void
}

export default function GuideCard({ guide, onDelete }: GuideCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [unpublishing, setUnpublishing] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${APP_URL}/guide/${guide.slug}`

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/guides/${guide.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setDeleteError('Something went wrong. Please try again.')
      setDeleting(false)
      return
    }
    onDelete(guide.id)
    setShowDeleteDialog(false)
  }

  async function handleCopyLink() {
    await copyToClipboard(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleUnpublish() {
    setUnpublishing(true)
    await fetch(`/api/guides/${guide.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: false }),
    })
    router.push(`/dashboard/guides/${guide.id}/editor`)
  }

  return (
    <>
      <Card hoverable animate className="p-4 flex flex-col gap-3 h-full">
        {/* Title + public badge */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/guides/${guide.id}/editor`}
            className="font-heading font-semibold text-base text-text-primary hover:text-accent transition-colors line-clamp-2 min-h-[3rem]"
          >
            {guide.title}
          </Link>
          <Badge variant={guide.is_public ? 'success' : 'default'} className="flex-shrink-0">
            {guide.is_public ? 'Published' : 'Draft'}
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
          {guide.is_public ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleCopyLink}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleUnpublish}
                loading={unpublishing}
              >
                Unpublish
              </Button>
            </>
          ) : (
            <Link href={`/dashboard/guides/${guide.id}/editor`} className="flex-1">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Edit
              </Button>
            </Link>
          )}

          <Button
            variant="danger"
            size="sm"
            className="text-xs"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </Button>
        </div>
      </Card>

      <Dialog
        open={showDeleteDialog}
        onClose={() => {
          if (!deleting) {
            setShowDeleteDialog(false)
            setDeleteError(null)
          }
        }}
      >
        <h2 className="font-heading font-semibold text-lg text-text-primary mb-2">
          Delete Guide?
        </h2>
        <p className="text-sm text-text-muted mb-5">
          This guide will be permanently deleted and any shared links will stop working. This action cannot be undone.
        </p>

        {deleteError && (
          <p className="text-sm text-error mb-4">{deleteError}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDeleteDialog(false)
              setDeleteError(null)
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  )
}
