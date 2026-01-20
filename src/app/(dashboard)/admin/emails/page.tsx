'use client'

import { useState } from 'react'
import { useUser } from '@/hooks'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Send,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  KeyRound,
  Shield,
  ShieldOff,
  PartyPopper,
  Trash2
} from 'lucide-react'

// Email template types
const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Sent to new users after signup',
    icon: PartyPopper,
    color: 'text-green-400'
  },
  {
    id: 'invite',
    name: 'Invite Code Email',
    description: 'Sent when sharing an invite code',
    icon: UserPlus,
    color: 'text-purple-400'
  },
  {
    id: 'password-reset',
    name: 'Password Reset Email',
    description: 'Sent when user requests password reset',
    icon: KeyRound,
    color: 'text-amber-400'
  },
  {
    id: '2fa-enabled',
    name: '2FA Enabled Email',
    description: 'Sent when user enables 2FA',
    icon: Shield,
    color: 'text-emerald-400'
  },
  {
    id: '2fa-disabled',
    name: '2FA Disabled Email',
    description: 'Sent when user disables 2FA',
    icon: ShieldOff,
    color: 'text-orange-400'
  },
  {
    id: 'account-deleted',
    name: 'Account Deleted Email',
    description: 'Sent when user deletes their account',
    icon: Trash2,
    color: 'text-red-400'
  },
]

export default function AdminEmailsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handlePreview = async (templateId: string) => {
    setLoadingPreview(true)
    setSelectedTemplate(templateId)
    setResult(null)

    try {
      const res = await fetch('/api/admin/emails/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateId })
      })

      if (res.ok) {
        const data = await res.json()
        setPreviewHtml(data.html)
      } else {
        setPreviewHtml('<p style="color: red;">Failed to load preview</p>')
      }
    } catch {
      setPreviewHtml('<p style="color: red;">Failed to load preview</p>')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return

    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          email: testEmail
        })
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: `Test email sent to ${testEmail}` })
      } else {
        setResult({ success: false, message: data.error || 'Failed to send test email' })
      }
    } catch {
      setResult({ success: false, message: 'Failed to send test email' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Email Templates</h1>
        <p className="page-subtitle">Preview and test all email templates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4">Available Templates</h2>

          <div className="space-y-2">
            {EMAIL_TEMPLATES.map((template) => {
              const Icon = template.icon
              const isSelected = selectedTemplate === template.id

              return (
                <button
                  key={template.id}
                  onClick={() => handlePreview(template.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-purple-500/10 border-purple-500/50'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${template.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{template.name}</p>
                    <p className="text-sm text-gray-500 truncate">{template.description}</p>
                  </div>
                  <Eye className={`w-5 h-5 ${isSelected ? 'text-purple-400' : 'text-gray-600'}`} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview & Test */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4">Preview & Test</h2>

          {!selectedTemplate ? (
            <div className="flex flex-col items-center justify-center h-96 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <Mail className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-500">Select a template to preview</p>
            </div>
          ) : (
            <>
              {/* Preview iframe */}
              <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white">
                {loadingPreview ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <iframe
                    srcDoc={previewHtml || ''}
                    className="w-full h-96"
                    title="Email Preview"
                  />
                )}
              </div>

              {/* Send Test */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                <p className="text-sm font-medium text-white">Send Test Email</p>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sending || !testEmail}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </button>
                </div>

                {result && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    result.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <p className="text-sm">{result.message}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
