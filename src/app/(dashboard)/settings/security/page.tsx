'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Smartphone, Key, Copy, Check, Loader2, AlertTriangle, Download, Trash2 } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { useSupabase, useUser, useUserSettings } from '@/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function SecuritySettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { settings, refreshSettings } = useUserSettings()

  // 2FA Setup state
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr')
  const [setupData, setSetupData] = useState<{
    secret: string
    qrCode: string
    backupCodes: string[]
  } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  // 2FA Disable state
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableError, setDisableError] = useState('')

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteTotpCode, setDeleteTotpCode] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Data export state
  const [exporting, setExporting] = useState(false)

  // Copied backup codes
  const [copiedCodes, setCopiedCodes] = useState(false)

  const is2FAEnabled = settings?.totp_enabled ?? false

  const handleStartSetup = async () => {
    setSetupLoading(true)
    setSetupError('')

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start 2FA setup')
      }

      setSetupData(data)
      setSetupStep('qr')
      setShowSetupModal(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start 2FA setup')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleVerifySetup = async () => {
    if (verifyCode.length !== 6) {
      setSetupError('Please enter a 6-digit code')
      return
    }

    setSetupLoading(true)
    setSetupError('')

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code')
      }

      setSetupStep('backup')
      await refreshSettings()
      toast.success('2FA enabled successfully!')
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Invalid code')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      setDisableError('Please enter a 6-digit code')
      return
    }

    setDisableLoading(true)
    setDisableError('')

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode, password: disablePassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA')
      }

      setShowDisableModal(false)
      setDisableCode('')
      setDisablePassword('')
      await refreshSettings()
      toast.success('2FA disabled successfully')
    } catch (error) {
      setDisableError(error instanceof Error ? error.message : 'Failed to disable 2FA')
    } finally {
      setDisableLoading(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/user/export')

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `multiloop-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')

    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          password: deletePassword,
          totpCode: is2FAEnabled ? deleteTotpCode : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      toast.success('Account deleted successfully')
      router.push('/login')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
      setCopiedCodes(true)
      setTimeout(() => setCopiedCodes(false), 2000)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Security & Privacy</h1>
        <p className="page-subtitle">Manage your account security and data privacy</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Two-Factor Authentication */}
        <section className="mb-8">
          <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Add an extra layer of security to your account by requiring a verification code
                  from your authenticator app.
                </p>

                <div className="mt-4">
                  {is2FAEnabled ? (
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2 text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        2FA is enabled
                      </span>
                      <button
                        onClick={() => setShowDisableModal(true)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleStartSetup}
                      disabled={setupLoading}
                    >
                      {setupLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4 mr-2" />
                          Enable 2FA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="mb-8">
          <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Download className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Export Your Data</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Download a copy of all your data including campaigns, characters, and settings.
                  This is your right under GDPR Article 20 (Data Portability).
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={handleExportData}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data (JSON)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Delete Account */}
        <section>
          <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-400">Delete Account</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                  This is your right under GDPR Article 17 (Right to Erasure).
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2FA Setup Modal */}
        {showSetupModal && (
          <Modal
            isOpen={showSetupModal}
            onClose={() => {
              if (setupStep !== 'backup' || !is2FAEnabled) {
                setShowSetupModal(false)
                setSetupStep('qr')
                setVerifyCode('')
                setSetupData(null)
              }
            }}
            title={setupStep === 'backup' ? 'Save Your Backup Codes' : 'Set Up Two-Factor Authentication'}
          >
            <div className="space-y-6">
              {setupStep === 'qr' && setupData && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    <div className="inline-block p-4 bg-[#12121a] rounded-xl">
                      <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-gray-500 mb-2">Or enter this code manually:</p>
                    <code className="text-sm text-purple-400 font-mono break-all">{setupData.secret}</code>
                  </div>

                  <Button onClick={() => setSetupStep('verify')} className="w-full">
                    Continue
                  </Button>
                </>
              )}

              {setupStep === 'verify' && (
                <>
                  <p className="text-sm text-gray-400">
                    Enter the 6-digit code from your authenticator app to verify setup.
                  </p>

                  {setupError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {setupError}
                    </div>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-purple-500/50"
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setSetupStep('qr')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifySetup}
                      disabled={verifyCode.length !== 6 || setupLoading}
                      className="flex-1"
                    >
                      {setupLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                </>
              )}

              {setupStep === 'backup' && setupData && (
                <>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      Save these backup codes in a safe place. You can use them to access your account
                      if you lose your authenticator device. Each code can only be used once.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#12121a] border border-white/[0.06]">
                    <div className="grid grid-cols-2 gap-2">
                      {setupData.backupCodes.map((code, i) => (
                        <code key={i} className="text-sm text-gray-300 font-mono py-1">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={copyBackupCodes}
                    className="w-full"
                  >
                    {copiedCodes ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Backup Codes
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      setShowSetupModal(false)
                      setSetupStep('qr')
                      setVerifyCode('')
                      setSetupData(null)
                    }}
                    className="w-full"
                  >
                    Done
                  </Button>
                </>
              )}
            </div>
          </Modal>
        )}

        {/* Disable 2FA Modal */}
        {showDisableModal && (
          <Modal
            isOpen={showDisableModal}
            onClose={() => {
              setShowDisableModal(false)
              setDisableCode('')
              setDisablePassword('')
              setDisableError('')
            }}
            title="Disable Two-Factor Authentication"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                To disable 2FA, enter your password and a verification code from your authenticator app.
              </p>

              {disableError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {disableError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">2FA Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-center text-xl tracking-widest font-mono placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDisableModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <button
                  onClick={handleDisable2FA}
                  disabled={disableLoading || !disablePassword || disableCode.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {disableLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Disable 2FA'
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false)
              setDeleteConfirmation('')
              setDeletePassword('')
              setDeleteTotpCode('')
              setDeleteError('')
            }}
            title="Delete Account"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-200 font-medium">This action cannot be undone!</p>
                  <p className="text-sm text-red-200/70 mt-1">
                    All your campaigns, characters, and data will be permanently deleted.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {is2FAEnabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">2FA Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={deleteTotpCode}
                    onChange={(e) => setDeleteTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-center text-xl tracking-widest font-mono placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmation !== 'DELETE' || !deletePassword || (is2FAEnabled && deleteTotpCode.length !== 6)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Delete My Account'
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  )
}
