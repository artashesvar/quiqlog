'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Fragment } from 'react'
import StepCard from './StepCard'
import TipAlertBlock from './TipAlertBlock'
import InsertBlockMenu from './InsertBlockMenu'
import type { Step } from '@/lib/types'

interface StepListProps {
  steps: Step[]
  onUpdate: (stepId: string, updates: Partial<Step>) => Promise<void>
  onDelete: (stepId: string) => Promise<void>
  onReorder: (reordered: Step[]) => Promise<void>
  onInsert: (afterIndex: number, type: 'tip' | 'alert') => Promise<void>
  isReadOnly?: boolean
}

export default function StepList({ steps, onUpdate, onDelete, onReorder, onInsert, isReadOnly = false }: StepListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    if (isReadOnly) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = steps.findIndex((s) => s.id === active.id)
    const newIndex = steps.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(steps, oldIndex, newIndex)

    onReorder(reordered)
  }

  // Track step count separately — only real steps get numbers
  let stepCount = 0

  return (
    <DndContext
      id="step-list-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={steps.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-4">
          {/* Insert button before the first item */}
          <InsertBlockMenu afterIndex={-1} onInsert={onInsert} isReadOnly={isReadOnly} />

          {steps.map((item, index) => {
            if (item.type === 'step') stepCount++
            const currentStepNumber = stepCount

            return (
              <Fragment key={item.id}>
                {item.type === 'step' ? (
                  <StepCard
                    step={item}
                    stepNumber={currentStepNumber}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
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
      </SortableContext>
    </DndContext>
  )
}
