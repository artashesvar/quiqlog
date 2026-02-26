'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import PublicGuideHeader from './PublicGuideHeader'
import PublicStep from './PublicStep'
import PublicTipAlertBlock from './PublicTipAlertBlock'
import type { Guide, Step } from '@/lib/types'

type Slide = {
  step: Step
  stepNumber: number
  attachedBlocks: Step[]
}

function buildSlides(steps: Step[]): Slide[] {
  const slides: Slide[] = []
  let stepNumber = 0
  for (const item of steps) {
    if (item.type === 'step') {
      stepNumber++
      slides.push({ step: item, stepNumber, attachedBlocks: [] })
    } else if (item.type === 'tip' || item.type === 'alert') {
      if (slides.length > 0) {
        slides[slides.length - 1].attachedBlocks.push(item)
      }
    }
  }
  return slides
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="4" x2="13" y2="4" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="3" y1="12" x2="13" y2="12" />
    </svg>
  )
}

function SlidesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <line x1="5" y1="13.5" x2="11" y2="13.5" />
      <line x1="8" y1="13" x2="8" y2="15" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 4 7 10 13 16" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 4 13 10 7 16" />
    </svg>
  )
}

interface Props {
  guide: Guide & { steps: Step[] }
}

export default function PublicGuideViewer({ guide }: Props) {
  const [mode, setMode] = useState<'slide' | 'scroll'>('slide')
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const slides = useMemo(() => buildSlides(guide.steps ?? []), [guide.steps])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, slides.length - 1))
  }, [slides.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  useEffect(() => {
    if (mode !== 'slide') return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, goNext, goPrev])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
    touchStartX.current = null
  }

  const currentSlide = slides[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === slides.length - 1

  const headerTitle =
    mode === 'slide' && currentIndex > 0 && currentSlide
      ? `Step ${currentSlide.stepNumber}: ${currentSlide.step.title || `Step ${currentSlide.stepNumber}`}`
      : guide.title

  const toggleButton = (
    <button
      onClick={() => {
        setCurrentIndex(0)
        setMode((m) => (m === 'slide' ? 'scroll' : 'slide'))
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary border border-border hover:border-border-hover rounded-md px-2.5 py-1.5 transition-colors"
    >
      {mode === 'slide' ? (
        <>
          <ListIcon />
          Scroll view
        </>
      ) : (
        <>
          <SlidesIcon />
          Slide view
        </>
      )}
    </button>
  )

  return (
    <>
      <PublicGuideHeader guide={guide} title={headerTitle} rightAction={toggleButton} />

      {mode === 'slide' ? (
        <div
          className="flex flex-col gap-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slide content with side arrows */}
          <div className="relative">
            {/* Left arrow: overlaid on mobile, outside the card on desktop */}
            <button
              onClick={goPrev}
              disabled={isFirst}
              aria-label="Previous step"
              className="absolute left-2 md:-left-11 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border hover:border-border-hover hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft />
            </button>

            {currentSlide && (
              <div className="flex flex-col gap-4">
                <PublicStep step={currentSlide.step} stepNumber={currentSlide.stepNumber} />
                {currentSlide.attachedBlocks.map((block) => (
                  <PublicTipAlertBlock key={block.id} block={block} />
                ))}
              </div>
            )}

            {/* Right arrow: overlaid on mobile, outside the card on desktop */}
            <button
              onClick={goNext}
              disabled={isLast}
              aria-label="Next step"
              className="absolute right-2 md:-right-11 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border hover:border-border-hover hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight />
            </button>
          </div>

          {/* Progress indicator */}
          <p className="text-center text-sm text-text-muted font-medium">
            Step {currentIndex + 1} of {slides.length}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {(() => {
            let stepCount = 0
            return (guide.steps ?? []).map((item: Step, index: number) => {
              if (item.type === 'step') stepCount++
              return (
                <div key={item.id} className={`stagger-${Math.min(index + 1, 9)}`}>
                  {item.type === 'tip' || item.type === 'alert' ? (
                    <PublicTipAlertBlock block={item} />
                  ) : (
                    <PublicStep step={item} stepNumber={stepCount} />
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}
    </>
  )
}
