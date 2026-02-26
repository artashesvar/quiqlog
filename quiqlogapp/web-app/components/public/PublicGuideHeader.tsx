import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Guide, Step } from '@/lib/types'

interface PublicGuideHeaderProps {
  guide: Guide & { steps: Step[] }
  title?: string
  rightAction?: React.ReactNode
}

export default function PublicGuideHeader({ guide, title, rightAction }: PublicGuideHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Guide title */}
      <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary leading-tight">
        {title ?? guide.title}
      </h1>

      {/* Meta row: logo + step count + date + optional toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {(() => {
          const count = guide.steps?.filter((s) => s.type === 'step').length ?? 0
          return (
            <Badge variant="accent">
              {count} step{count !== 1 ? 's' : ''}
            </Badge>
          )
        })()}
        <span className="text-text-muted text-sm">
          Created {formatDate(guide.created_at)}
        </span>
        {rightAction && (
          <div className="ml-auto">
            {rightAction}
          </div>
        )}
      </div>

      <hr className="border-border" />
    </div>
  )
}
