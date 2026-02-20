import GuideCard from './GuideCard'
import type { Guide } from '@/lib/types'

interface GuideListProps {
  guides: (Guide & { step_count: number })[]
}

export default function GuideList({ guides }: GuideListProps) {
  if (guides.length === 0) {
    return (
      <div className="text-center py-20 rounded-lg border border-dashed border-border">
        <div className="text-5xl mb-4">📖</div>
        <h3 className="font-heading font-semibold text-lg text-text-primary mb-2">
          No guides yet
        </h3>
        <p className="text-text-muted text-sm max-w-xs mx-auto">
          Install the extension and click &ldquo;Start Recording&rdquo; to capture your first guide.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((guide) => (
        <GuideCard key={guide.id} guide={guide} />
      ))}
    </div>
  )
}
