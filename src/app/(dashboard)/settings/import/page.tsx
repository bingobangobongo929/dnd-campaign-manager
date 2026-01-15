'use client'

import { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ImportPage() {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    imported?: number
    updated?: number
    errors?: string[]
    total?: number
  } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const characters = JSON.parse(text)

      const response = await fetch('/api/vault/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characters })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to parse JSON file']
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[--bg-base] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[--text-primary] mb-2">Import Vault Characters</h1>
        <p className="text-[--text-secondary] mb-8">
          Upload a JSON file containing character data to bulk import into your vault.
        </p>

        <div className="bg-[--bg-surface] border border-[--border] rounded-xl p-8">
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[--border] rounded-xl cursor-pointer hover:border-[--arcane-purple] hover:bg-[--bg-hover] transition-all">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
            {importing ? (
              <>
                <Loader2 className="w-10 h-10 text-[--arcane-purple] mb-4 animate-spin" />
                <span className="text-[--text-secondary]">Importing characters...</span>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-[--text-tertiary] mb-4" />
                <span className="text-[--text-secondary]">Click to upload JSON file</span>
                <span className="text-sm text-[--text-tertiary] mt-2">vault_characters_import.json</span>
              </>
            )}
          </label>
        </div>

        {result && (
          <div className={`mt-6 p-6 rounded-xl border ${
            result.success
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
              <span className={`font-semibold ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.success ? 'Import Complete' : 'Import Failed'}
              </span>
            </div>

            {result.success && (
              <div className="space-y-2 text-[--text-secondary]">
                <p>New characters imported: <span className="text-[--text-primary] font-medium">{result.imported}</span></p>
                <p>Existing characters updated: <span className="text-[--text-primary] font-medium">{result.updated}</span></p>
                <p>Total processed: <span className="text-[--text-primary] font-medium">{result.total}</span></p>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-red-400 font-medium mb-2">Errors:</p>
                <ul className="space-y-1 text-sm text-red-300">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-[--bg-elevated] rounded-lg border border-[--border]">
          <p className="text-sm text-[--text-tertiary]">
            <strong className="text-[--text-secondary]">File location:</strong><br />
            C:\Users\edbar\Downloads\Character\vault_characters_import.json
          </p>
        </div>
      </div>
    </div>
  )
}
