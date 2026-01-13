'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import { X, Send, Sparkles, User, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

interface AIAssistantProps {
  campaignContext?: {
    campaignName: string
    gameSystem: string
    characters: { name: string; type: string; summary?: string }[]
    recentSessions: { title: string; summary?: string }[]
  }
}

export function AIAssistant({ campaignContext }: AIAssistantProps) {
  const { isAIAssistantOpen, setIsAIAssistantOpen, aiProvider } = useAppStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    error,
  } = useChat({
    api: '/api/ai/chat',
    streamProtocol: 'text',
    body: {
      campaignContext,
      provider: aiProvider,
    },
    onError: (err) => {
      console.error('AI Chat error:', err)
      setLocalError(err.message || 'Failed to connect to AI service')
    },
    onFinish: () => {
      setLocalError(null)
    },
  })

  // Clear error when user starts typing
  useEffect(() => {
    if (input && localError) {
      setLocalError(null)
    }
  }, [input, localError])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isAIAssistantOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isAIAssistantOpen])

  const handleClearChat = () => {
    setMessages([])
  }

  if (!isAIAssistantOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={() => setIsAIAssistantOpen(false)}
      />

      {/* Panel */}
      <div className="ai-assistant-panel">
        {/* Header */}
        <div className="ai-assistant-header">
          <div className="flex items-center gap-3">
            <div className="ai-assistant-avatar">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[--text-primary]">Campaign Assistant</h2>
              <p className="text-xs text-[--text-tertiary]">
                Powered by {aiProvider === 'google' ? 'Gemini' : 'Claude'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                className="btn-ghost btn-icon w-9 h-9"
                onClick={handleClearChat}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              className="btn-ghost btn-icon w-9 h-9"
              onClick={() => setIsAIAssistantOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="ai-assistant-messages">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[--arcane-purple] to-[--arcane-gold] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display font-semibold text-[--text-primary] mb-2">
                How can I help?
              </h3>
              <p className="text-sm text-[--text-secondary] mb-6 max-w-xs mx-auto">
                I can answer questions about your campaign, suggest plot ideas, or help with world-building.
              </p>
              <div className="space-y-2">
                {[
                  'What plot hooks could involve a character?',
                  'Suggest an encounter for our next session',
                  'Help me describe a mysterious tavern',
                  'Generate a random NPC with backstory',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const fakeEvent = {
                        target: { value: suggestion },
                      } as React.ChangeEvent<HTMLInputElement>
                      handleInputChange(fakeEvent)
                    }}
                    className="ai-suggestion-chip"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3 animate-slide-in-up',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {message.role !== 'user' && (
                <div className="ai-message-avatar">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'ai-message',
                  message.role === 'user' ? 'ai-message-user' : 'ai-message-assistant'
                )}
              >
                {message.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none text-sm">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-[--text-primary]">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-semibold mb-2 text-[--text-primary]">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 text-[--text-primary]">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-[--text-primary]">{children}</h3>,
                        code: ({ children }) => <code className="bg-[--bg-base] px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-[--arcane-purple] pl-3 italic text-[--text-secondary]">{children}</blockquote>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[--bg-elevated] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[--text-secondary]" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="ai-message-avatar">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="ai-message ai-message-assistant">
                <Loader2 className="w-4 h-4 animate-spin text-[--arcane-purple]" />
              </div>
            </div>
          )}

          {/* Error display */}
          {(localError || error) && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-[--arcane-ember]/20 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-[--arcane-ember]" />
              </div>
              <div className="ai-message bg-[--arcane-ember]/10 border border-[--arcane-ember]/30">
                <p className="text-sm text-[--arcane-ember]">
                  {localError || error?.message || 'Something went wrong. Please try again.'}
                </p>
                <p className="text-xs text-[--text-tertiary] mt-1">
                  Check if API keys are configured in your environment.
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="ai-assistant-input">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your campaign..."
              className="form-input flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
