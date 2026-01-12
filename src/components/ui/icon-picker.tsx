'use client'

import { Check } from 'lucide-react'
import {
  Users,
  Swords,
  Shield,
  Crown,
  Skull,
  Heart,
  Star,
  Flame,
  Sparkles,
  Castle,
  Map,
  Compass,
  BookOpen,
  Scroll,
  Key,
  Gem,
  Coins,
  Target,
  Zap,
  Eye,
  Mountain,
  TreePine,
  Anchor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Icon options for groups
export const GROUP_ICONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'users', label: 'Party', Icon: Users },
  { value: 'swords', label: 'Combat', Icon: Swords },
  { value: 'shield', label: 'Defense', Icon: Shield },
  { value: 'crown', label: 'Royalty', Icon: Crown },
  { value: 'skull', label: 'Enemies', Icon: Skull },
  { value: 'heart', label: 'Allies', Icon: Heart },
  { value: 'star', label: 'Important', Icon: Star },
  { value: 'flame', label: 'Fire', Icon: Flame },
  { value: 'sparkles', label: 'Magic', Icon: Sparkles },
  { value: 'castle', label: 'Location', Icon: Castle },
  { value: 'map', label: 'Region', Icon: Map },
  { value: 'compass', label: 'Navigation', Icon: Compass },
  { value: 'book', label: 'Lore', Icon: BookOpen },
  { value: 'scroll', label: 'Quests', Icon: Scroll },
  { value: 'key', label: 'Secrets', Icon: Key },
  { value: 'gem', label: 'Treasure', Icon: Gem },
  { value: 'coins', label: 'Merchants', Icon: Coins },
  { value: 'target', label: 'Objectives', Icon: Target },
  { value: 'zap', label: 'Power', Icon: Zap },
  { value: 'eye', label: 'Watchers', Icon: Eye },
  { value: 'mountain', label: 'Mountains', Icon: Mountain },
  { value: 'tree', label: 'Forest', Icon: TreePine },
  { value: 'anchor', label: 'Maritime', Icon: Anchor },
  { value: 'moon', label: 'Night', Icon: Moon },
  { value: 'sun', label: 'Day', Icon: Sun },
]

// Helper to get icon component by value
export function getGroupIcon(value: string | null): LucideIcon {
  const found = GROUP_ICONS.find((i) => i.value === value)
  return found?.Icon || Users
}

interface IconPickerProps {
  value: string | null
  onChange: (icon: string) => void
  color?: string
  className?: string
}

export function IconPicker({
  value,
  onChange,
  color = '#8B5CF6',
  className,
}: IconPickerProps) {
  return (
    <div className={cn('grid grid-cols-5 gap-1.5', className)}>
      {GROUP_ICONS.map(({ value: iconValue, label, Icon }) => (
        <button
          key={iconValue}
          type="button"
          onClick={() => onChange(iconValue)}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all relative',
            value === iconValue
              ? 'scale-110'
              : 'hover:scale-110 bg-[#1a1a24] hover:bg-[#222230]'
          )}
          style={{
            backgroundColor: value === iconValue ? `${color}20` : undefined,
            color: value === iconValue ? color : '#a0a0b0',
            boxShadow: value === iconValue ? `0 0 0 2px #12121a, 0 0 0 4px ${color}` : undefined,
          }}
          title={label}
        >
          <Icon className="w-5 h-5" />
          {value === iconValue && (
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
