'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { X, Send, Sparkles, User, Loader2, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
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

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: '/api/ai/chat',
    body: {
      campaignContext,
      provider: aiProvider,
    },
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
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
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsAIAssistantOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[--bg-surface] border-l border-[--border] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[--border]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
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
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIAssistantOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-[--accent-secondary] mb-4" />
              <h3 className="font-semibold text-[--text-primary] mb-2">
                How can I help?
              </h3>
              <p className="text-sm text-[--text-secondary] mb-4">
                I can answer questions about your campaign, suggest plot ideas, or help with world-building.
              </p>
              <div className="space-y-2">
                {[
                  'What plot hooks could involve [character name]?',
                  'Suggest an encounter for our next session',
                  'What happened in the last session?',
                  'Help me describe a tavern the party visits',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const fakeEvent = {
                        target: { value: suggestion },
                      } as React.ChangeEvent<HTMLInputElement>
                      handleInputChange(fakeEvent)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-[--text-secondary] bg-[--bg-hover] rounded-lg hover:bg-[--bg-hover]/80 transition-colors"
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
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2',
                  message.role === 'user'
                    ? 'bg-[--accent-primary] text-white'
                    : 'bg-[--bg-hover] text-[--text-primary]'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[--bg-hover] flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-[--text-secondary]" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="bg-[--bg-hover] rounded-2xl px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[--text-tertiary]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[--border]">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your campaign..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
