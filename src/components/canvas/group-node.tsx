'use client'

import { memo } from 'react'
import { NodeResizer } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Trash2, Edit2 } from 'lucide-react'
import { Button, getGroupIcon } from '@/components/ui'
import type { CanvasGroup } from '@/types/database'

export interface GroupNodeData extends Record<string, unknown> {
  group: CanvasGroup
  onUpdate: (id: string, updates: Partial<CanvasGroup>) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

function GroupNodeComponent({ data, selected }: { data: GroupNodeData; selected?: boolean }) {
  const { group, onUpdate, onDelete, onEdit } = data

  const GroupIcon = getGroupIcon(group.icon)

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-[--accent-primary]"
        handleClassName="!w-3 !h-3 !bg-[--accent-primary] !border-none"
        onResize={(_, params) => {
          onUpdate(group.id, { width: params.width, height: params.height })
        }}
      />
      <div
        className={cn(
          'w-full h-full rounded-2xl border-2 border-dashed transition-all',
          selected
            ? 'border-[--accent-primary] bg-[--accent-primary]/5'
            : 'border-[--border] bg-[--bg-hover]/20'
        )}
        style={{
          backgroundColor: group.color ? `${group.color}08` : undefined,
          borderColor: group.color || undefined,
        }}
      >
        {/* Header - Much more prominent */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Group Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: group.color ? `${group.color}20` : 'var(--bg-elevated)',
                }}
              >
                <GroupIcon
                  className="w-5 h-5"
                  style={{ color: group.color || 'var(--text-secondary)' }}
                />
              </div>

              <h2
                className="text-2xl font-bold tracking-tight cursor-grab"
                style={{ color: group.color || 'var(--text-primary)' }}
              >
                {group.name}
              </h2>
            </div>

            {/* Edit/Delete buttons - only show when selected */}
            {selected && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-60 hover:opacity-100"
                  onClick={() => onEdit(group.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[--arcane-ember] opacity-60 hover:opacity-100"
                  onClick={() => onDelete(group.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export const GroupNode = memo(GroupNodeComponent)
