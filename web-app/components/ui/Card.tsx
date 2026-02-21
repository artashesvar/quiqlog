import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  glow?: boolean
  animate?: boolean
}

export function Card({
  hoverable = false,
  glow = false,
  animate = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'bg-background-secondary rounded-lg border border-border shadow-soft transition-all duration-300 ease-out',
        hoverable &&
          'cursor-pointer hover:border-accent/40 hover:shadow-card-hover hover:-translate-y-1',
        glow && 'shadow-glow',
        animate && 'opacity-0 animate-card-enter',
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
