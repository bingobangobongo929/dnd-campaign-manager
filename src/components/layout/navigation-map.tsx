'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Swords,
  BookOpen,
  Scroll,
  Settings,
  LayoutGrid,
  ScrollText,
  Clock,
  Brain,
  Network,
  Map,
  Image,
  Eye,
  Users,
  ChevronRight,
  Share2,
  Download,
  X,
  HelpCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui'

interface NavigationNode {
  label: string
  icon: any
  href?: string
  description?: string
  children?: NavigationNode[]
}

const NAVIGATION_TREE: NavigationNode[] = [
  {
    label: 'Home',
    icon: Home,
    href: '/home',
    description: 'Dashboard overview of your campaigns and characters',
  },
  {
    label: 'Campaigns',
    icon: Swords,
    href: '/campaigns',
    description: 'Create and manage your TTRPG campaigns',
    children: [
      {
        label: 'Canvas',
        icon: LayoutGrid,
        description: 'Visual character board with drag-and-drop',
      },
      {
        label: 'Sessions',
        icon: ScrollText,
        description: 'Log your game sessions with AI assistance',
      },
      {
        label: 'Timeline',
        icon: Clock,
        description: 'Track events and story progression',
      },
      {
        label: 'Intelligence',
        icon: Brain,
        description: 'AI-powered campaign assistant',
      },
      {
        label: 'Lore',
        icon: Network,
        description: 'World-building knowledge base',
      },
      {
        label: 'World Map',
        icon: Map,
        description: 'Interactive maps with points of interest',
      },
      {
        label: 'Gallery',
        icon: Image,
        description: 'Media and artwork for your campaign',
      },
    ],
  },
  {
    label: 'One-Shots',
    icon: Scroll,
    href: '/campaigns?tab=oneshots',
    description: 'Standalone adventures ready to run',
  },
  {
    label: 'Character Vault',
    icon: BookOpen,
    href: '/vault',
    description: 'Personal character portfolio across campaigns',
    children: [
      {
        label: 'View',
        icon: Eye,
        description: 'Beautiful character sheet display',
      },
      {
        label: 'Intelligence',
        icon: Brain,
        description: 'AI assistant for your character',
      },
      {
        label: 'Relationships',
        icon: Users,
        description: 'Track connections and bonds',
      },
      {
        label: 'Sessions',
        icon: ScrollText,
        description: 'Play journal and session notes',
      },
      {
        label: 'Gallery',
        icon: Image,
        description: 'Character art and references',
      },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    description: 'Configure your experience',
    children: [
      {
        label: 'Share Analytics',
        icon: Share2,
        description: 'Track engagement on shared content',
      },
      {
        label: 'Import',
        icon: Download,
        description: 'Bulk import characters',
      },
    ],
  },
]

function NavNode({ node, depth = 0, onNavigate }: { node: NavigationNode; depth?: number; onNavigate: (href: string) => void }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.children && node.children.length > 0
  const Icon = node.icon

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-white/10' : ''}`}>
      <button
        onClick={() => {
          if (node.href) {
            onNavigate(node.href)
          } else if (hasChildren) {
            setExpanded(!expanded)
          }
        }}
        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors text-left group ${
          depth === 0 ? '' : 'pl-4'
        }`}
      >
        <div className={`p-2 rounded-lg ${depth === 0 ? 'bg-[--arcane-purple]/10' : 'bg-white/5'}`}>
          <Icon className={`w-4 h-4 ${depth === 0 ? 'text-[--arcane-purple]' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${depth === 0 ? 'text-white' : 'text-gray-300'}`}>{node.label}</p>
          {node.description && (
            <p className="text-xs text-gray-500 truncate">{node.description}</p>
          )}
        </div>
        {hasChildren && (
          <ChevronRight
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
        {node.href && !hasChildren && (
          <span className="text-xs text-gray-600 group-hover:text-[--arcane-purple]">Go</span>
        )}
      </button>

      {hasChildren && expanded && (
        <div className="mt-1 space-y-1">
          {node.children!.map((child, index) => (
            <NavNode key={index} node={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

interface NavigationMapModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NavigationMapModal({ isOpen, onClose }: NavigationMapModalProps) {
  const router = useRouter()

  const handleNavigate = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Navigation Guide"
      description="Explore all areas of the app"
    >
      <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 space-y-2">
        {NAVIGATION_TREE.map((node, index) => (
          <NavNode key={index} node={node} onNavigate={handleNavigate} />
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-start gap-3 text-xs text-gray-500">
          <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Click on any section to navigate directly. Items with arrows can be expanded to show sub-pages.
            Use the floating dock on the left (or bottom on mobile) for quick navigation.
          </p>
        </div>
      </div>
    </Modal>
  )
}

// Button to open the navigation map
export function NavigationMapButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all text-gray-400 hover:text-white"
        title="Navigation Guide"
      >
        <Map className="w-4 h-4" />
        <span className="hidden sm:inline">Navigate</span>
      </button>
      <NavigationMapModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
