'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  Check,
  X,
  Loader2,
  Users,
  Scroll,
  Quote,
  MessageSquare,
  Target,
  ArrowRight,
  AlertCircle,
  Heart,
} from 'lucide-react'

interface ParsedData {
  character: {
    name: string
    race?: string | null
    class?: string | null
    backstory?: string | null
    quotes?: string[]
    plot_hooks?: string[]
  }
  npcs?: {
    name: string
    relationship_type: string
    full_notes?: string | null
  }[]
  companions?: {
    name: string
    companion_type: string
    companion_species?: string | null
  }[]
  session_notes?: {
    session_number: number
    notes: string
  }[]
  writings?: {
    title: string
    writing_type: string
  }[]
}

interface ParseStats {
  npcCount: number
  companionCount: number
  sessionCount: number
  writingCount: number
  quoteCount: number
  plotHookCount: number
  hasBackstory: boolean
  backstoryLength: number
  hasTldr: boolean
}

export default function VaultImportPage() {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [parseStats, setParseStats] = useState<ParseStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  // Handle file selection
  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setParsedData(null)

    // For now, we'll read .txt files directly
    // For .docx, we'd need server-side processing
    if (selectedFile.name.endsWith('.txt')) {
      const text = await selectedFile.text()
      setExtractedText(text)
    } else if (selectedFile.name.endsWith('.docx')) {
      setError('For .docx files, please paste the text content below. Direct .docx upload coming soon.')
    } else {
      setError('Please upload a .txt or .docx file')
    }
  }

  // Parse the document
  const handleParse = async () => {
    if (!extractedText.trim()) {
      setError('Please provide document text to parse')
      return
    }

    setParsing(true)
    setError(null)

    try {
      const response = await fetch('/api/vault/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: extractedText,
          characterName: file?.name.replace(/\.(txt|docx)$/i, ''),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse document')
      }

      setParsedData(data.parsed)
      setParseStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document')
    } finally {
      setParsing(false)
    }
  }

  // Import the parsed data
  const handleImport = async () => {
    if (!parsedData) return

    setImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/vault/import-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsed: parsedData,
          sourceFile: file?.name,
          rawDocumentText: extractedText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import character')
      }

      // Redirect to the imported character
      router.push(`/vault/${data.characterId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import character')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[--bg-base] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Import Character</h1>
          <p className="text-gray-400">
            Upload a character document to automatically extract NPCs, session notes, writings, and more.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
            dragActive
              ? 'border-[--arcane-purple] bg-purple-500/10'
              : 'border-[--border] hover:border-[--arcane-purple]/50 bg-[--bg-surface]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".txt,.docx"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg text-white mb-2">
            {file ? file.name : 'Drop your character document here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to browse (.txt or .docx)
          </p>
        </div>

        {/* Text Input Area */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Or paste your document text directly:
          </label>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            placeholder="Paste your character document here..."
            className="w-full h-64 p-4 bg-[--bg-surface] border border-[--border] rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[--arcane-purple]/50 resize-none font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            {extractedText.length.toLocaleString()} characters
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Parse Button */}
        <div className="mt-6">
          <button
            onClick={handleParse}
            disabled={!extractedText.trim() || parsing}
            className="btn btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {parsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Analyzing Document...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Parse Document
              </>
            )}
          </button>
        </div>

        {/* Parsed Results Preview */}
        {parsedData && parseStats && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Document Parsed Successfully</h2>
                <p className="text-sm text-gray-400">Review the extracted data below</p>
              </div>
            </div>

            {/* Character Name */}
            <div className="p-6 bg-[--bg-surface] border border-[--border] rounded-xl">
              <h3 className="text-2xl font-bold text-white mb-4">{parsedData.character.name}</h3>
              <div className="flex flex-wrap gap-3 text-sm">
                {parsedData.character.race && (
                  <span className="px-3 py-1 bg-purple-500/15 text-purple-400 rounded-lg border border-purple-500/20">
                    {parsedData.character.race}
                  </span>
                )}
                {parsedData.character.class && (
                  <span className="px-3 py-1 bg-blue-500/15 text-blue-400 rounded-lg border border-blue-500/20">
                    {parsedData.character.class}
                  </span>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-white">{parseStats.npcCount}</div>
                <div className="text-xs text-gray-500">NPCs</div>
              </div>
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl text-center">
                <Heart className="w-6 h-6 mx-auto mb-2 text-pink-400" />
                <div className="text-2xl font-bold text-white">{parseStats.companionCount}</div>
                <div className="text-xs text-gray-500">Companions</div>
              </div>
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl text-center">
                <Scroll className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-white">{parseStats.sessionCount}</div>
                <div className="text-xs text-gray-500">Sessions</div>
              </div>
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl text-center">
                <Quote className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold text-white">{parseStats.writingCount}</div>
                <div className="text-xs text-gray-500">Writings</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">Quotes</span>
                </div>
                <div className="text-lg font-semibold text-white">{parseStats.quoteCount}</div>
              </div>
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-400">Plot Hooks</span>
                </div>
                <div className="text-lg font-semibold text-white">{parseStats.plotHookCount}</div>
              </div>
              <div className="p-4 bg-[--bg-surface] border border-[--border] rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Backstory</span>
                </div>
                <div className="text-lg font-semibold text-white">
                  {parseStats.hasBackstory ? `${(parseStats.backstoryLength / 1000).toFixed(1)}k chars` : 'None'}
                </div>
              </div>
            </div>

            {/* NPC Preview */}
            {parsedData.npcs && parsedData.npcs.length > 0 && (
              <div className="p-6 bg-[--bg-surface] border border-[--border] rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">NPCs Found</h3>
                <div className="space-y-2">
                  {parsedData.npcs.slice(0, 5).map((npc, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-white">{npc.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded capitalize">
                        {npc.relationship_type}
                      </span>
                      {npc.full_notes && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {npc.full_notes.length} chars of notes
                        </span>
                      )}
                    </div>
                  ))}
                  {parsedData.npcs.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{parsedData.npcs.length - 5} more NPCs
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Importing Character...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Import to Vault
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
