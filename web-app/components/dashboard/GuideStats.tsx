import { FileText, Globe, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface GuideStatsProps {
  drafts: number
  published: number
  recentCount: number
}

const stats = (drafts: number, published: number, recentCount: number) => [
  {
    icon: FileText,
    iconClass: 'text-amber-400',
    label: 'Guides in Draft',
    value: drafts,
  },
  {
    icon: Globe,
    iconClass: 'text-emerald-400',
    label: 'Guides Published',
    value: published,
  },
  {
    icon: CalendarDays,
    iconClass: 'text-indigo-400',
    label: 'Recorded in last 7 days',
    value: recentCount,
  },
]

export default function GuideStats({ drafts, published, recentCount }: GuideStatsProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading font-semibold text-lg text-text-primary">Stats</h2>
      <div className="grid grid-cols-3 gap-4">
        {stats(drafts, published, recentCount).map(({ icon: Icon, iconClass, label, value }) => (
          <Card key={label} className="flex items-center gap-4 px-5 py-4">
            <Icon className={`${iconClass} shrink-0`} size={20} />
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-heading text-text-primary leading-none">
                {value}
              </span>
              <span className="text-sm text-text-muted mt-1">{label}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
