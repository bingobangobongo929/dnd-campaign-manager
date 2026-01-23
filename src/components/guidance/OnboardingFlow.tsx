'use client'

import { useState } from 'react'
import {
  ChevronRight, ChevronLeft, Check, Sparkles,
  BookOpen, Users, Map, Clock, Wand2, Upload,
  FileText, Link2, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGuidanceTip, type GuidanceTipId } from '@/hooks/useGuidance'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  tips: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

interface OnboardingFlowProps {
  tipId: GuidanceTipId
  type: 'campaign' | 'character' | 'oneshot'
  onComplete?: () => void
  className?: string
}

export function OnboardingFlow({
  tipId,
  type,
  onComplete,
  className,
}: OnboardingFlowProps) {
  const { shouldShow, dismiss, isLoaded } = useGuidanceTip(tipId)
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const steps = getStepsForType(type)

  if (!isLoaded || !shouldShow || !isVisible) {
    return null
  }

  const handleComplete = () => {
    dismiss()
    setIsVisible(false)
    onComplete?.()
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    dismiss()
    setIsVisible(false)
  }

  const step = steps[currentStep]

  return (
    <div className={cn(
      "bg-[#1a1a24] border border-purple-500/30 rounded-xl overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="p-4 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-white">
              {type === 'campaign' && 'Getting Started with Your Campaign'}
              {type === 'character' && 'Building Your Character'}
              {type === 'oneshot' && 'Creating Your Oneshot'}
            </h3>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 rounded-full transition-all",
                index === currentStep
                  ? "w-8 bg-purple-500"
                  : index < currentStep
                  ? "w-4 bg-purple-500/50"
                  : "w-4 bg-white/10"
              )}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl shrink-0">
            {step.icon}
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-medium text-white mb-2">{step.title}</h4>
            <p className="text-gray-400 text-sm mb-4">{step.description}</p>

            {/* Tips */}
            <div className="space-y-2 mb-4">
              {step.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">{tip}</p>
                </div>
              ))}
            </div>

            {step.action && (
              <button
                onClick={step.action.onClick}
                className="btn btn-sm btn-secondary"
              >
                {step.action.label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={cn(
            "flex items-center gap-1 text-sm transition-colors",
            currentStep === 0
              ? "text-gray-600 cursor-not-allowed"
              : "text-gray-400 hover:text-white"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span className="text-xs text-gray-500">
          Step {currentStep + 1} of {steps.length}
        </span>
        <button
          onClick={handleNext}
          className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          {currentStep === steps.length - 1 ? 'Done' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function getStepsForType(type: 'campaign' | 'character' | 'oneshot'): OnboardingStep[] {
  if (type === 'campaign') {
    return [
      {
        id: 'sessions',
        title: 'Document Your Sessions',
        description: 'Sessions are the foundation of your campaign. After each game, add notes about what happened.',
        icon: <BookOpen className="w-6 h-6 text-gray-400" />,
        tips: [
          'Session notes feed into Campaign Intelligence',
          'Players can add their own perspectives',
          'Notes are used to generate timeline events and NPC suggestions',
        ],
      },
      {
        id: 'characters',
        title: 'Add Your Characters',
        description: 'Create the heroes, villains, and NPCs that populate your world.',
        icon: <Users className="w-6 h-6 text-gray-400" />,
        tips: [
          'Import characters from PDFs or images with AI',
          'Track relationships between characters',
          'Players can claim and manage their own characters',
        ],
      },
      {
        id: 'intelligence',
        title: 'Use Campaign Intelligence',
        description: 'Let AI analyze your session notes to suggest timeline events, detect NPCs, and find inconsistencies.',
        icon: <Sparkles className="w-6 h-6 text-gray-400" />,
        tips: [
          'Run Intelligence after updating session notes',
          'Review and accept suggestions with one click',
          'Provide feedback to improve suggestions',
        ],
      },
      {
        id: 'collaboration',
        title: 'Invite Your Players',
        description: 'Add players to your campaign so they can view shared content and contribute notes.',
        icon: <Users className="w-6 h-6 text-gray-400" />,
        tips: [
          'Invite via email or Discord',
          'Control what players can see and do',
          'Players can claim their characters to their vault',
        ],
      },
    ]
  }

  if (type === 'character') {
    return [
      {
        id: 'basics',
        title: 'Fill in the Basics',
        description: 'Start with your character\'s name, appearance, and core personality traits.',
        icon: <FileText className="w-6 h-6 text-gray-400" />,
        tips: [
          'You can import from a PDF or image to fill fields automatically',
          'Link to your D&D Beyond character sheet',
          'Add portraits and reference images',
        ],
      },
      {
        id: 'backstory',
        title: 'Develop Your Backstory',
        description: 'Tell your character\'s story through the backstory phases.',
        icon: <BookOpen className="w-6 h-6 text-gray-400" />,
        tips: [
          'Use the Early Life, Inciting Incident, and Recent Past sections',
          'Character Intelligence can spot inconsistencies',
          'Backstory feeds into relationship suggestions',
        ],
      },
      {
        id: 'journal',
        title: 'Keep a Play Journal',
        description: 'Document your character\'s experiences and growth as you play.',
        icon: <Wand2 className="w-6 h-6 text-gray-400" />,
        tips: [
          'Add entries after each session',
          'Share entries to campaigns or keep private',
          'Track character development over time',
        ],
      },
      {
        id: 'campaigns',
        title: 'Link to Campaigns',
        description: 'Your vault character can be used across multiple campaigns.',
        icon: <Link2 className="w-6 h-6 text-gray-400" />,
        tips: [
          'Session 0 snapshot preserves original state',
          'Campaign-specific details stay separate',
          'Fork from any snapshot for new campaigns',
        ],
      },
    ]
  }

  // Oneshot
  return [
    {
      id: 'content',
      title: 'Write Your Adventure',
      description: 'Use the text sections to outline your oneshot\'s introduction, setting, and key scenes.',
      icon: <FileText className="w-6 h-6 text-gray-400" />,
      tips: [
        'Include read-aloud text for immersion',
        'Keep DM notes and secrets separate',
        'Plan for different player choices',
      ],
    },
    {
      id: 'npcs',
      title: 'Create NPCs',
      description: 'Add the characters your players will meet with structured profiles.',
      icon: <Users className="w-6 h-6 text-gray-400" />,
      tips: [
        'Include appearance, personality, and motivation',
        'Link to external stat blocks if needed',
        'NPCs are included when publishing as a template',
      ],
    },
    {
      id: 'encounters',
      title: 'Plan Encounters',
      description: 'Set up combat encounters, puzzles, and challenges.',
      icon: <Shield className="w-6 h-6 text-gray-400" />,
      tips: [
        'Note difficulty and recommended party level',
        'Include tactics and terrain features',
        'Plan rewards and loot',
      ],
    },
    {
      id: 'present',
      title: 'Run with Present Mode',
      description: 'Use Present Mode for a clean reading experience during the game.',
      icon: <Sparkles className="w-6 h-6 text-gray-400" />,
      tips: [
        'Quick navigation between scenes',
        'Mark sections as complete',
        'Expandable NPC and encounter cards',
      ],
    },
  ]
}

// Compact version for sidebars or smaller spaces
interface CompactOnboardingProps {
  tipId: GuidanceTipId
  title: string
  steps: string[]
  onDismiss?: () => void
  className?: string
}

export function CompactOnboarding({
  tipId,
  title,
  steps,
  onDismiss,
  className,
}: CompactOnboardingProps) {
  const { shouldShow, dismiss, isLoaded } = useGuidanceTip(tipId)

  if (!isLoaded || !shouldShow) {
    return null
  }

  const handleDismiss = () => {
    dismiss()
    onDismiss?.()
  }

  return (
    <div className={cn(
      "p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-purple-300">{title}</h4>
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs shrink-0">
              {index + 1}
            </span>
            <span className="text-sm text-gray-400">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
