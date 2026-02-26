import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import type { Step } from '@/lib/types'

interface PublicStepProps {
  step: Step
  stepNumber: number
}

export default function PublicStep({ step, stepNumber }: PublicStepProps) {
  const zoom = step.zoom_level ?? 1
  const panX = step.pan_x ?? 0
  const panY = step.pan_y ?? 0
  const hasIndicator = step.indicator_x !== null && step.indicator_y !== null

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
        <div className="relative mx-5 mb-3 rounded-md overflow-hidden border border-border transition-shadow duration-300 hover:shadow-soft-lg">
          <Image
            src={step.screenshot_url}
            alt={step.title || `Step ${stepNumber}`}
            width={800}
            height={450}
            className="w-full h-auto"
            unoptimized
            style={
              zoom > 1
                ? {
                    transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
                    transformOrigin: 'center center',
                  }
                : undefined
            }
          />

          {/* Click indicator overlay — rendered when a custom position is saved */}
          {hasIndicator && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: zoom > 1 ? `scale(${zoom}) translate(${panX}%, ${panY}%)` : undefined,
                transformOrigin: 'center center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${step.indicator_x}%`,
                  top: `${step.indicator_y}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                  width: 40,
                  height: 40,
                }}
              >
                {/* Outer circle */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'rgba(255, 215, 0, 0.35)',
                  border: '2.5px solid #FFD700',
                }} />
                {/* Inner dot */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#FFD700',
                }} />
              </div>
            </div>
          )}
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
