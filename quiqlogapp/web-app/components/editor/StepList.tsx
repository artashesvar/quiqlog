'use client'

import { Fragment } from 'react'
import StepCard from './StepCard'
import TipAlertBlock from './TipAlertBlock'
import InsertBlockMenu from './InsertBlockMenu'
import type { Step } from '@/lib/types'

interface StepListProps {
  steps: Step[]
  onUpdate: (stepId: string, updates: Partial<Step>) => Promise<void>
  onDelete: (stepId: string) => Promise<boolean>
  onReorder: (reordered: Step[]) => Promise<void>
  onInsert: (afterIndex: number, type: 'tip' | 'alert') => Promise<void>
  isReadOnly?: boolean
}

// A "group" is a step + all consecutive tips/alerts directly after it.
function buildGroups(steps: Step[]): Step[][] {
  const groups: Step[][] = []
  for (const item of steps) {
    if (item.type === 'step') {
      groups.push([item])
    } else {
      if (groups.length > 0) groups[groups.length - 1].push(item)
    }
  }
  return groups
}

function swapGroups(steps: Step[], groupA: number, groupB: number): Step[] {
  const groups = buildGroups(steps)
  const tmp = groups[groupA]
  groups[groupA] = groups[groupB]
  groups[groupB] = tmp
  return groups.flat()
}

export default function StepList({ steps, onUpdate, onDelete, onReorder, onInsert, isReadOnly = false }: StepListProps) {
  const groups = buildGroups(steps)

  // Track step count separately — only real steps get numbers
  let stepCount = 0

  return (
    <div className="flex flex-col gap-4">
      {steps.map((item, index) => {
        if (item.type === 'step') stepCount++
        const currentStepNumber = stepCount

        let onMoveUp: (() => void) | undefined
        let onMoveDown: (() => void) | undefined

        if (!isReadOnly && item.type === 'step') {
          const groupIndex = groups.findIndex(g => g[0].id === item.id)
          if (groupIndex > 0)
            onMoveUp = () => onReorder(swapGroups(steps, groupIndex - 1, groupIndex))
          if (groupIndex < groups.length - 1)
            onMoveDown = () => onReorder(swapGroups(steps, groupIndex, groupIndex + 1))
        }

        return (
          <Fragment key={item.id}>
            {item.type === 'step' ? (
              <StepCard
                step={item}
                stepNumber={currentStepNumber}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                isReadOnly={isReadOnly}
              />
            ) : (
              <TipAlertBlock
                block={item}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isReadOnly={isReadOnly}
              />
            )}

            {/* Insert button after each item */}
            <InsertBlockMenu afterIndex={index} onInsert={onInsert} isReadOnly={isReadOnly} />
          </Fragment>
        )
      })}
    </div>
  )
}
