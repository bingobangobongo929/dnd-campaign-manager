'use client'

import { memo, useState } from 'react'
import { NodeProps, NodeResizer } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { GripVertical, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { CanvasGroup } from '@/types/database'

export interface GroupNodeData {
  group: CanvasGroup
  onUpdate: (id: string, updates: Partial<CanvasGroup>) => void
  onDelete: (id: string) => void
}

function GroupNodeComponent({ data, selected }: NodeProps<GroupNodeData>) {
  const { group, onUpdate, onDelete } = data
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(group.name)

  const handleSave = () => {
    if (name.trim()) {
      onUpdate(group.id, { name: name.trim() })
    } else {
      setName(group.name)
    }
    setIsEditing(false)
  }

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-[--accent-primary]"
        handleClassName="!w-3 !h-3 !bg-[--accent-primary] !border-none"
        onResize={(_, params) => {
          onUpdate(group.id, { width: params.width, height: params.height })
        }}
      />
      <div
        className={cn(
          'w-full h-full rounded-xl border-2 border-dashed transition-all',
          selected
            ? 'border-[--accent-primary] bg-[--accent-primary]/5'
            : 'border-[--border] bg-[--bg-hover]/30'
        )}
        style={{
          backgroundColor: group.color ? `${group.color}10` : undefined,
          borderColor: group.color || undefined,
        }}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 border-b border-dashed cursor-grab',
            selected ? 'border-[--accent-primary]/50' : 'border-[--border]'
          )}
          style={{ borderColor: group.color ? `${group.color}50` : undefined }}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-[--text-tertiary]" />
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-7 w-32 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') {
                      setName(group.name)
                      setIsEditing(false)
                    }
                  }}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setName(group.name)
                    setIsEditing(false)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span
                className="font-semibold text-sm"
                style={{ color: group.color || 'var(--text-primary)' }}
              >
                {group.name}
              </span>
            )}
          </div>
          {selected && !isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[--accent-danger]"
                onClick={() => onDelete(group.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export const GroupNode = memo(GroupNodeComponent)
