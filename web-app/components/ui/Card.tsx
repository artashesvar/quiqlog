import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  glow?: boolean
}

export function Card({
  hoverable = false,
  glow = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'bg-background-secondary rounded-lg border border-border shadow-soft',
        hoverable &&
          'cursor-pointer transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg hover:-translate-y-0.5',
        glow && 'shadow-glow',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
