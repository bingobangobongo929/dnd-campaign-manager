'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft, Swords, BookOpen, Scroll, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabase, useUser } from '@/hooks'

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
}

interface TourStep {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  bgGradient: string
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Sparkles className="w-10 h-10" />,
    title: 'Welcome to Multiloop',
    description: 'Your personal TTRPG campaign manager. Track campaigns, characters, and adventures all in one place.',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
  },
  {
    icon: <Swords className="w-10 h-10" />,
    title: 'Campaign Canvas',
    description: 'Build your world on an infinite canvas. Add characters, locations, factions, and lore cards that you can drag, connect, and organize however you like.',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
  },
  {
    icon: <BookOpen className="w-10 h-10" />,
    title: 'Character Vault',
    description: 'Store all your player characters in one vault. Track stats, backstory, session journals, and character growth across multiple campaigns.',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
  },
  {
    icon: <Scroll className="w-10 h-10" />,
    title: 'One-Shot Adventures',
    description: 'Plan standalone adventures with encounter builders and quick reference notes. Perfect for game nights or testing new systems.',
    color: 'text-amber-400',
    bgGradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
  },
]

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = useSupabase()
  const { user } = useUser()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip()
    },
    []
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  const markOnboardingComplete = async () => {
    if (!user) return
    try {
      await supabase
        .from('user_settings')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error)
    }
  }

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }

    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePrev = () => {
    if (isAnimating || currentStep === 0) return
    setIsAnimating(true)
    setCurrentStep(prev => prev - 1)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleSkip = () => {
    markOnboardingComplete()
    onClose()
  }

  const handleComplete = () => {
    markOnboardingComplete()
    onClose()
  }

  if (!isOpen || !mounted) return null

  const step = TOUR_STEPS[currentStep]
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleSkip}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-[#12121a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
          step.bgGradient
        )} />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors z-10"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative z-10 p-8 pt-12 text-center">
          {/* Icon */}
          <div className={cn(
            "inline-flex p-4 rounded-2xl mb-6 transition-all duration-300",
            step.color,
            step.color === 'text-purple-400' && 'bg-purple-500/15',
            step.color === 'text-blue-400' && 'bg-blue-500/15',
            step.color === 'text-amber-400' && 'bg-amber-500/15',
          )}>
            {step.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-display font-bold text-white mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-400 leading-relaxed max-w-md mx-auto">
            {step.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {TOUR_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true)
                  setCurrentStep(index)
                  setTimeout(() => setIsAnimating(false), 300)
                }
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "w-6 bg-purple-500"
                  : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              currentStep === 0
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            {isLastStep ? "Get Started" : "Next"}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
