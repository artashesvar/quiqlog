import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import type { Guide, Step } from '@/lib/types'

interface PublicGuideHeaderProps {
  guide: Guide & { steps: Step[] }
}

export default function PublicGuideHeader({ guide }: PublicGuideHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Branding */}
      <Link href="/" className="inline-flex items-center gap-2 w-fit">
        <div className="w-2 h-2 rounded-full bg-accent shadow-glow" />
        <span className="font-heading font-bold text-sm text-text-secondary">
          {APP_NAME}
        </span>
      </Link>

      {/* Guide title */}
      <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text-primary leading-tight">
        {guide.title}
      </h1>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="accent">
          {guide.steps?.length ?? 0} step{(guide.steps?.length ?? 0) !== 1 ? 's' : ''}
        </Badge>
        <span className="text-text-muted text-sm">
          Created {formatDate(guide.created_at)}
        </span>
      </div>

      <hr className="border-border" />
    </div>
  )
}
