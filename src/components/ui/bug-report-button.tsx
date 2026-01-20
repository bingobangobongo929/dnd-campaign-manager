'use client'

import { useState } from 'react'
import { Bug, X, Send, ExternalLink, AlertCircle, Lightbulb, HelpCircle } from 'lucide-react'

const GITHUB_REPO = 'bingobangobongo929/multiloop-feedback'

type FeedbackType = 'bug' | 'feature' | 'question'

interface FeedbackOption {
  id: FeedbackType
  label: string
  icon: typeof Bug
  color: string
  template: string
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    id: 'bug',
    label: 'Report a Bug',
    icon: AlertCircle,
    color: 'text-red-400',
    template: `**Describe the bug**
A clear description of what the bug is.

**Steps to reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Browser/Device**
- Browser: [e.g. Chrome, Firefox, Safari]
- Device: [e.g. Desktop, iPhone]`
  },
  {
    id: 'feature',
    label: 'Suggest a Feature',
    icon: Lightbulb,
    color: 'text-amber-400',
    template: `**Feature description**
A clear description of the feature you'd like.

**Problem it solves**
What problem does this solve?

**Alternatives considered**
Any alternative solutions you've considered.`
  },
  {
    id: 'question',
    label: 'Ask a Question',
    icon: HelpCircle,
    color: 'text-blue-400',
    template: `**Question**
What would you like to know?

**Context**
Any relevant context about your question.`
  }
]

export function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleOpen = () => {
    setIsOpen(true)
    setSelectedType(null)
    setTitle('')
    setDescription('')
  }

  const handleSelectType = (type: FeedbackType) => {
    setSelectedType(type)
    const option = FEEDBACK_OPTIONS.find(o => o.id === type)
    if (option) {
      setDescription(option.template)
    }
  }

  const handleSubmit = () => {
    if (!selectedType || !title.trim()) return

    const labels = {
      bug: 'bug',
      feature: 'enhancement',
      question: 'question'
    }

    const body = encodeURIComponent(description)
    const issueTitle = encodeURIComponent(title)
    const label = labels[selectedType]

    // Open GitHub issue with pre-filled content
    const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${issueTitle}&body=${body}&labels=${label}`
    window.open(url, '_blank')

    setIsOpen(false)
  }

  const selectedOption = FEEDBACK_OPTIONS.find(o => o.id === selectedType)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        title="Report Bug / Feedback"
      >
        <Bug className="w-5 h-5" />
        <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Feedback
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedType ? selectedOption?.label : 'Send Feedback'}
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedType ? 'Opens GitHub Issues' : 'Help us improve Multiloop'}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!selectedType ? (
                // Type selection
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 mb-4">What would you like to share?</p>
                  {FEEDBACK_OPTIONS.map(option => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelectType(option.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${option.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-white font-medium">{option.label}</span>
                      </button>
                    )
                  })}

                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-200/80">
                      <strong>Note:</strong> This will open a GitHub issue. You'll need a GitHub account to submit.
                    </p>
                  </div>
                </div>
              ) : (
                // Form
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedType(null)}
                    className="text-sm text-purple-400 hover:text-purple-300 mb-2"
                  >
                    ← Back to options
                  </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Brief summary..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 font-mono text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!title.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in GitHub
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
