import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import type { Step } from '@/lib/types'

interface PublicStepProps {
  step: Step
  stepNumber: number
}

export default function PublicStep({ step, stepNumber }: PublicStepProps) {
  return (
    <Card animate className="overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center shadow-glow">
          {stepNumber}
        </span>
        <h2 className="font-heading font-semibold text-lg text-text-primary">
          {step.title || `Step ${stepNumber}`}
        </h2>
      </div>

      {/* Screenshot */}
      {step.screenshot_url && (
        <div className="mx-5 mb-3 rounded-md overflow-hidden border border-border transition-shadow duration-300 hover:shadow-soft-lg">
          <Image
            src={step.screenshot_url}
            alt={step.title || `Step ${stepNumber}`}
            width={800}
            height={450}
            className="w-full h-auto"
            unoptimized
          />
        </div>
      )}

      {/* Description */}
      {step.description && (
        <p className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">
          {step.description}
        </p>
      )}
    </Card>
  )
}
