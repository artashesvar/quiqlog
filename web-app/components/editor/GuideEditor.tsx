'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import GuideHeader from './GuideHeader'
import StepList from './StepList'
import PaywallOverlay from './PaywallOverlay'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { copyToClipboard } from '@/lib/utils'
import { APP_URL } from '@/lib/constants'
import type { Guide, Step } from '@/lib/types'

interface GuideEditorProps {
  guide: Guide & { steps: Step[] }
  isLocked?: boolean
}

export default function GuideEditor({ guide: initialGuide, isLocked = false }: GuideEditorProps) {
  const [guide, setGuide] = useState(initialGuide)
  const [steps, setSteps] = useState<Step[]>(initialGuide.steps ?? [])
  const [copied, setCopied] = useState(false)

  const shareUrl = `${APP_URL}/guide/${guide.slug}`

  const updateGuide = useCallback(async (updates: Partial<Guide>) => {
    const res = await fetch(`/api/guides/${guide.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      toast.error('Failed to update guide')
      return
    }
    const updated = await res.json()
    setGuide((g) => ({ ...g, ...updated }))
    toast.success('Saved')
  }, [guide.id])

  const updateStep = useCallback(async (stepId: string, updates: Partial<Step>) => {
    const res = await fetch(`/api/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      toast.error('Failed to update step')
      return
    }
    const updated = await res.json()
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...updated } : s)))
  }, [])

  const deleteStep = useCallback(async (stepId: string): Promise<boolean> => {
    const res = await fetch(`/api/steps/${stepId}`, { method: 'DELETE' })
    if (!res.ok) return false
    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    toast.success('Step deleted')
    return true
  }, [])

  const reorderSteps = useCallback(async (reordered: Step[]) => {
    setSteps(reordered)
    await Promise.all(
      reordered.map((step, index) =>
        fetch(`/api/steps/${step.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: index }),
        })
      )
    )
  }, [])

  const insertBlock = useCallback(async (afterIndex: number, type: 'tip' | 'alert') => {
    const res = await fetch(`/api/guides/${guide.id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: '', description: '' }),
    })
    if (!res.ok) {
      toast.error('Failed to insert block')
      return
    }
    const newBlock: Step = await res.json()

    setSteps((prev) => {
      const insertAt = afterIndex + 1
      const next = [...prev.slice(0, insertAt), newBlock, ...prev.slice(insertAt)]
      // Re-index all items to reflect the new order
      Promise.all(
        next.map((step, index) =>
          fetch(`/api/steps/${step.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: index }),
          })
        )
      )
      return next
    })
  }, [guide.id])

  async function handleCopyLink() {
    await copyToClipboard(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {isLocked && <PaywallOverlay />}

      <div className="max-w-3xl mx-auto flex flex-col gap-6 relative">
        {/* Left gutter: back link */}
        <Link
          href="/dashboard"
          className="text-sm text-text-muted hover:text-text-secondary transition-colors whitespace-nowrap mb-2 lg:mb-0 lg:absolute lg:right-full lg:top-1 lg:mr-8"
        >
          ← Back to Dashboard
        </Link>

        <GuideHeader guide={guide} onUpdate={updateGuide} isReadOnly={guide.is_public} />

        {/* Badge — right-4 aligns its right edge with the step screenshot images (mx-4) */}
        <div className="lg:absolute lg:right-4 lg:top-1">
          <Badge variant={guide.is_public ? 'success' : 'default'}>
            {guide.is_public ? 'Published' : 'Draft'}
          </Badge>
        </div>

        {/* Right gutter: action buttons — fixed width so all buttons are the same size */}
        <div className="flex flex-wrap items-center gap-2 -mt-4 lg:mt-0 lg:absolute lg:left-full lg:top-0 lg:ml-8 lg:flex-col lg:items-stretch lg:gap-2 lg:w-52">
          <Button
            variant="secondary"
            size="sm"
            className="px-5 w-full"
            onClick={() => updateGuide({ is_public: !guide.is_public })}
          >
            {guide.is_public ? 'Unpublish' : 'Publish'}
          </Button>
          {guide.is_public && (
            <>
              <Button variant="ghost" size="sm" className="px-5 w-full" onClick={handleCopyLink}>
                {copied ? '✓ Copied' : 'Copy Share Link'}
              </Button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="w-full">
                <Button variant="ghost" size="sm" className="px-5 w-full">
                  View Public Guide ↗
                </Button>
              </a>
            </>
          )}
        </div>

        <StepList
          steps={steps}
          onUpdate={updateStep}
          onDelete={deleteStep}
          onReorder={reorderSteps}
          onInsert={insertBlock}
          isReadOnly={guide.is_public}
        />

        {steps.length === 0 && (
          <div className="text-center py-16 rounded-lg border border-dashed border-border">
            <p className="text-text-muted text-sm">
              No steps yet. Use the extension to record your workflow.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
