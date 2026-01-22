'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  ChevronRight,
  ChevronLeft,
  Camera,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react'
import { useFeedback } from './FeedbackProvider'
import { captureAllContext } from '@/lib/feedback-context'
import { cn } from '@/lib/utils'
import type { FeedbackType, FeedbackPriority, FeedbackFrequency } from '@/types/database'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'

// Step definitions
type Step = 'type' | 'details' | 'reproduce' | 'attachments' | 'review'

interface FeedbackFormData {
  type: FeedbackType | null
  title: string
  description: string
  priority: FeedbackPriority | null
  affectedArea: string | null
  reproduceSteps: string[]
  expectedBehavior: string
  actualBehavior: string
  frequency: FeedbackFrequency | null
  attachments: AttachmentFile[]
}

interface AttachmentFile {
  id: string
  file: File
  preview: string
  isScreenshot: boolean
}

const AFFECTED_AREAS = [
  'Characters',
  'Campaigns',
  'Sessions',
  'Oneshots',
  'Sharing',
  'Admin',
  'Settings',
  'Other',
]

const TYPE_OPTIONS: { id: FeedbackType; label: string; description: string; icon: typeof Bug; color: string }[] = [
  {
    id: 'bug',
    label: 'Bug Report',
    description: "Something isn't working right",
    icon: Bug,
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    description: 'I have an idea for improvement',
    icon: Lightbulb,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  {
    id: 'question',
    label: 'Question',
    description: 'I need help with something',
    icon: HelpCircle,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  },
  {
    id: 'praise',
    label: 'Praise',
    description: 'I love something about Multiloop!',
    icon: Heart,
    color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  },
]

const PRIORITY_OPTIONS: { id: FeedbackPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'text-gray-400' },
  { id: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { id: 'high', label: 'High', color: 'text-orange-400' },
  { id: 'critical', label: 'Critical', color: 'text-red-400' },
]

const FREQUENCY_OPTIONS: { id: FeedbackFrequency; label: string }[] = [
  { id: 'always', label: 'Every time' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'once', label: 'Just happened once' },
]

const DRAFT_KEY = 'multiloop_feedback_draft'

function getInitialFormData(): FeedbackFormData {
  return {
    type: null,
    title: '',
    description: '',
    priority: null,
    affectedArea: null,
    reproduceSteps: [''],
    expectedBehavior: '',
    actualBehavior: '',
    frequency: null,
    attachments: [],
  }
}

export function FeedbackModal() {
  const { isOpen, closeFeedback, preselectedType } = useFeedback()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>('type')
  const [formData, setFormData] = useState<FeedbackFormData>(getInitialFormData())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showContextPreview, setShowContextPreview] = useState(false)
  const [capturedContext, setCapturedContext] = useState<ReturnType<typeof captureAllContext> | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mount check for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check for draft on open
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          // Don't restore attachments (File objects can't be serialized)
          setHasDraft(true)
          if (draft.type) {
            setFormData({ ...draft, attachments: [] })
            setStep('details')
          }
        } catch {
          // Invalid draft, ignore
        }
      }

      // If preselected type, set it
      if (preselectedType) {
        setFormData(prev => ({ ...prev, type: preselectedType }))
        setStep('details')
      }
    }
  }, [isOpen, preselectedType])

  // Auto-save draft
  useEffect(() => {
    if (!isOpen || !formData.type) return

    const timer = setTimeout(() => {
      const draftData = { ...formData, attachments: [] } // Don't save files
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    }, 30000) // Save every 30 seconds

    return () => clearTimeout(timer)
  }, [isOpen, formData])

  // Capture context when opening review step
  useEffect(() => {
    if (step === 'review') {
      setCapturedContext(captureAllContext())
    }
  }, [step])

  const handleClose = useCallback(() => {
    // Save draft before closing if there's content
    if (formData.type && formData.title) {
      const draftData = { ...formData, attachments: [] }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    }
    closeFeedback()
    // Reset state after animation
    setTimeout(() => {
      setStep('type')
      setFormData(getInitialFormData())
      setCapturedContext(null)
      setShowContextPreview(false)
    }, 200)
  }, [closeFeedback, formData])

  const handleRestoreDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_KEY)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setFormData({ ...draft, attachments: [] })
        if (draft.type) setStep('details')
      } catch {
        // Invalid draft
      }
    }
    setHasDraft(false)
  }

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  const handleSelectType = (type: FeedbackType) => {
    setFormData(prev => ({
      ...prev,
      type,
      priority: type === 'bug' ? 'medium' : null,
    }))
    setStep('details')
  }

  const handleCaptureScreenshot = async () => {
    setIsCapturingScreenshot(true)
    // Hide the modal temporarily
    const modal = document.getElementById('feedback-modal')
    if (modal) modal.style.display = 'none'

    try {
      // Wait a bit for modal to hide
      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        scale: 1,
        backgroundColor: '#0a0a0f',
      })

      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })
          const preview = canvas.toDataURL('image/png')

          setFormData(prev => ({
            ...prev,
            attachments: [
              ...prev.attachments,
              {
                id: `screenshot-${Date.now()}`,
                file,
                preview,
                isScreenshot: true,
              },
            ],
          }))
          toast.success('Screenshot captured!')
        }
      }, 'image/png')
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      toast.error('Failed to capture screenshot')
    } finally {
      // Show modal again
      if (modal) modal.style.display = ''
      setIsCapturingScreenshot(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          setFormData(prev => ({
            ...prev,
            attachments: [
              ...prev.attachments,
              {
                id: `upload-${Date.now()}-${Math.random()}`,
                file,
                preview: reader.result as string,
                isScreenshot: false,
              },
            ],
          }))
        }
        reader.readAsDataURL(file)
      }
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id),
    }))
  }

  const handleAddReproduceStep = () => {
    setFormData(prev => ({
      ...prev,
      reproduceSteps: [...prev.reproduceSteps, ''],
    }))
  }

  const handleUpdateReproduceStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      reproduceSteps: prev.reproduceSteps.map((s, i) => (i === index ? value : s)),
    }))
  }

  const handleRemoveReproduceStep = (index: number) => {
    if (formData.reproduceSteps.length <= 1) return
    setFormData(prev => ({
      ...prev,
      reproduceSteps: prev.reproduceSteps.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!formData.type || !formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    const context = capturedContext || captureAllContext()

    try {
      // Create FormData for file upload
      const submitData = new FormData()
      submitData.append('type', formData.type)
      submitData.append('title', formData.title.trim())
      submitData.append('description', formData.description.trim())

      if (formData.priority) submitData.append('priority', formData.priority)
      if (formData.affectedArea) submitData.append('affectedArea', formData.affectedArea)
      if (formData.frequency) submitData.append('frequency', formData.frequency)

      // Bug-specific fields
      if (formData.type === 'bug') {
        const steps = formData.reproduceSteps.filter(s => s.trim())
        if (steps.length > 0) submitData.append('reproduceSteps', steps.join('\n'))
        if (formData.expectedBehavior.trim()) submitData.append('expectedBehavior', formData.expectedBehavior.trim())
        if (formData.actualBehavior.trim()) submitData.append('actualBehavior', formData.actualBehavior.trim())
      }

      // Context data
      submitData.append('context', JSON.stringify(context))

      // Attachments
      formData.attachments.forEach((attachment, index) => {
        submitData.append(`attachment_${index}`, attachment.file)
        submitData.append(`attachment_${index}_isScreenshot`, String(attachment.isScreenshot))
      })

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: submitData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit feedback')
      }

      // Clear draft
      localStorage.removeItem(DRAFT_KEY)

      toast.success('Thank you for your feedback! We\'ll review it soon.')
      handleClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepIndex = (s: Step) => {
    const steps: Step[] = formData.type === 'bug'
      ? ['type', 'details', 'reproduce', 'attachments', 'review']
      : ['type', 'details', 'attachments', 'review']
    return steps.indexOf(s)
  }

  const getTotalSteps = () => formData.type === 'bug' ? 5 : 4

  const handleNext = () => {
    const steps: Step[] = formData.type === 'bug'
      ? ['type', 'details', 'reproduce', 'attachments', 'review']
      : ['type', 'details', 'attachments', 'review']
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: Step[] = formData.type === 'bug'
      ? ['type', 'details', 'reproduce', 'attachments', 'review']
      : ['type', 'details', 'attachments', 'review']
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'type':
        return formData.type !== null
      case 'details':
        return formData.title.trim() && formData.description.trim()
      case 'reproduce':
        return true // Optional
      case 'attachments':
        return true // Optional
      case 'review':
        return true
      default:
        return false
    }
  }

  if (!mounted || !isOpen) return null

  const selectedType = TYPE_OPTIONS.find(t => t.id === formData.type)

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        id="feedback-modal"
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {selectedType && (
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border', selectedType.color)}>
                <selectedType.icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">
                {step === 'type' ? 'Send Feedback' : selectedType?.label || 'Feedback'}
              </h2>
              {step !== 'type' && (
                <p className="text-sm text-gray-400">
                  Step {getStepIndex(step)} of {getTotalSteps() - 1}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Draft restore prompt */}
        {hasDraft && step === 'type' && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
            <p className="text-sm text-purple-200">
              You have an unsaved draft. Would you like to restore it?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDiscardDraft}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white"
              >
                Discard
              </button>
              <button
                onClick={handleRestoreDraft}
                className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
              >
                Restore
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Type Selection */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">What would you like to share?</p>
              {TYPE_OPTIONS.map(option => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectType(option.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                      formData.type === option.id
                        ? option.color
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', option.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-white font-medium block">{option.label}</span>
                      <span className="text-sm text-gray-400">{option.description}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Details Form */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief summary of your feedback..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell us more details..."
                  rows={5}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              {formData.type === 'bug' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setFormData(prev => ({ ...prev, priority: option.id }))}
                        className={cn(
                          'px-4 py-2 rounded-lg border transition-all',
                          formData.priority === option.id
                            ? 'bg-white/10 border-white/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        )}
                      >
                        <span className={option.color}>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Affected Area <span className="text-gray-500">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AFFECTED_AREAS.map(area => (
                    <button
                      key={area}
                      onClick={() => setFormData(prev => ({ ...prev, affectedArea: prev.affectedArea === area ? null : area }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-sm transition-all',
                        formData.affectedArea === area
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reproduce Steps (Bugs only) */}
          {step === 'reproduce' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Steps to Reproduce <span className="text-gray-500">(optional but helpful!)</span>
                </label>
                <div className="space-y-2">
                  {formData.reproduceSteps.map((stepText, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="w-6 h-10 flex items-center justify-center text-gray-500 text-sm">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={stepText}
                        onChange={e => handleUpdateReproduceStep(index, e.target.value)}
                        placeholder={index === 0 ? 'First, I...' : 'Then I...'}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                      />
                      {formData.reproduceSteps.length > 1 && (
                        <button
                          onClick={() => handleRemoveReproduceStep(index)}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddReproduceStep}
                  className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  + Add another step
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expected Behavior
                  </label>
                  <textarea
                    value={formData.expectedBehavior}
                    onChange={e => setFormData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                    placeholder="What should have happened?"
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Actual Behavior
                  </label>
                  <textarea
                    value={formData.actualBehavior}
                    onChange={e => setFormData(prev => ({ ...prev, actualBehavior: e.target.value }))}
                    placeholder="What actually happened?"
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How often does this happen?
                </label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCY_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setFormData(prev => ({ ...prev, frequency: option.id }))}
                      className={cn(
                        'px-4 py-2 rounded-lg border transition-all',
                        formData.frequency === option.id
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attachments */}
          {step === 'attachments' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Add screenshots or images to help us understand the issue better.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturingScreenshot}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 border border-purple-600/40 rounded-xl text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                >
                  {isCapturingScreenshot ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  <span>Capture Screenshot</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload Image</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Attachment previews */}
              {formData.attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {formData.attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="relative group rounded-lg overflow-hidden border border-white/10"
                    >
                      <img
                        src={attachment.preview}
                        alt="Attachment"
                        className="w-full h-32 object-cover"
                      />
                      {attachment.isScreenshot && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded">
                          Screenshot
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formData.attachments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No attachments yet</p>
                </div>
              )}
            </div>
          )}

          {/* Review */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  {selectedType && (
                    <selectedType.icon className={cn('w-5 h-5', selectedType.color.split(' ')[0])} />
                  )}
                  <span className="font-medium text-white">{formData.title}</span>
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{formData.description}</p>

                {formData.priority && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Priority:</span>
                    <span className={PRIORITY_OPTIONS.find(p => p.id === formData.priority)?.color}>
                      {formData.priority}
                    </span>
                  </div>
                )}

                {formData.affectedArea && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Area:</span>
                    <span className="text-gray-300">{formData.affectedArea}</span>
                  </div>
                )}

                {formData.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Attachments:</span>
                    <span className="text-gray-300">{formData.attachments.length} file(s)</span>
                  </div>
                )}
              </div>

              {/* Context disclosure */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <button
                  onClick={() => setShowContextPreview(!showContextPreview)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-blue-300">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">Technical info we'll capture</span>
                  </div>
                  {showContextPreview ? (
                    <EyeOff className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-blue-400" />
                  )}
                </button>

                {showContextPreview && capturedContext && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Page:</span>
                      <span className="text-gray-300 truncate ml-2">{capturedContext.currentRoute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Browser:</span>
                      <span className="text-gray-300">{capturedContext.browserInfo.name} {capturedContext.browserInfo.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">OS:</span>
                      <span className="text-gray-300">{capturedContext.browserInfo.os}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Screen:</span>
                      <span className="text-gray-300">{capturedContext.screenResolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Session:</span>
                      <span className="text-gray-300">{Math.floor(capturedContext.sessionDurationSeconds / 60)} min</span>
                    </div>
                    {capturedContext.consoleErrors.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Errors captured:</span>
                        <span className="text-amber-400">{capturedContext.consoleErrors.length}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between shrink-0">
          {step !== 'type' ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step !== 'review' ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
