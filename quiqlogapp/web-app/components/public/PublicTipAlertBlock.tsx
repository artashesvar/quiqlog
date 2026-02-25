import type { Step } from '@/lib/types'

interface PublicTipAlertBlockProps {
  block: Step
}

const config = {
  tip: {
    label: 'Tip',
    containerClass: 'border-l-2 border-l-blue-500 bg-blue-500/5',
    labelClass: 'text-blue-400',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M8 1a5 5 0 0 1 3.5 8.5l-.5.5V12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2l-.5-.5A5 5 0 0 1 8 1z" />
        <path d="M6 13.5h4" />
        <path d="M6.5 15h3" />
      </svg>
    ),
  },
  alert: {
    label: 'Alert',
    containerClass: 'border-l-2 border-l-amber-500 bg-amber-500/5',
    labelClass: 'text-amber-400',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M8 2 L14.5 13.5 H1.5 Z" />
        <path d="M8 6v3.5" />
        <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
} as const

export default function PublicTipAlertBlock({ block }: PublicTipAlertBlockProps) {
  const type = block.type === 'alert' ? 'alert' : 'tip'
  const { label, containerClass, labelClass, icon } = config[type]

  return (
    <div className={`rounded-lg px-4 py-3 flex flex-col gap-1.5 ${containerClass}`}>
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
        {icon}
        {label}
      </div>
      {block.title && (
        <p className="font-heading font-semibold text-sm text-text-primary">{block.title}</p>
      )}
      {block.description && (
        <p className="text-sm text-text-secondary leading-relaxed">{block.description}</p>
      )}
    </div>
  )
}
