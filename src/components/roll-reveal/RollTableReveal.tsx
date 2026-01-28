'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dice5, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RollTableRevealProps {
  tableName: string
  rollValue: number
  resultText: string
  dieType: string
  onClose: () => void
}

export function RollTableReveal({
  tableName,
  rollValue,
  resultText,
  dieType,
  onClose,
}: RollTableRevealProps) {
  const [phase, setPhase] = useState(0) // 0: spinning, 1: slowing, 2: result
  const [displayNumber, setDisplayNumber] = useState(1)
  const [copied, setCopied] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const dieSize = parseInt(dieType.slice(1)) || 20

  // Slot machine animation
  useEffect(() => {
    let speed = 30 // Start fast
    let elapsed = 0
    const totalDuration = 1500 // 1.5 seconds

    const updateNumber = () => {
      elapsed += speed
      setDisplayNumber(Math.floor(Math.random() * dieSize) + 1)

      if (elapsed >= totalDuration * 0.6) {
        // Start slowing down
        setPhase(1)
        speed = Math.min(speed + 20, 300) // Slow down progressively
      }

      if (elapsed >= totalDuration) {
        // Show final result
        setDisplayNumber(rollValue)
        setPhase(2)
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }

      // Schedule next update with current speed
      intervalRef.current = setTimeout(updateNumber, speed)
    }

    intervalRef.current = setTimeout(updateNumber, speed)

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [rollValue, dieSize])

  // Copy result
  const copyResult = () => {
    navigator.clipboard.writeText(`${tableName}: ${resultText} (rolled ${rollValue})`)
    setCopied(true)
    toast.success('Result copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={phase === 2 ? onClose : undefined}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Main content */}
        <motion.div
          className="relative z-10 w-full max-w-md"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          {/* Die roll display */}
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-2">{tableName}</p>

            {/* Animated die */}
            <motion.div
              className="relative inline-flex items-center justify-center w-24 h-24 mx-auto"
              animate={{
                rotate: phase === 0 ? [0, 360] : phase === 1 ? [0, 180] : 0,
              }}
              transition={{
                duration: phase === 0 ? 0.3 : phase === 1 ? 0.5 : 0,
                repeat: phase < 2 ? Infinity : 0,
                ease: phase === 0 ? 'linear' : 'easeOut',
              }}
            >
              {/* Die background */}
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl border-2 transition-colors duration-300",
                  phase === 2
                    ? "bg-orange-500/20 border-orange-500/50"
                    : "bg-purple-500/20 border-purple-500/50"
                )}
                style={{
                  boxShadow: phase === 2
                    ? '0 0 30px rgba(249, 115, 22, 0.4)'
                    : '0 0 20px rgba(139, 92, 246, 0.3)',
                }}
              />

              {/* Number display */}
              <motion.span
                className={cn(
                  "relative text-4xl font-bold tabular-nums transition-colors duration-300",
                  phase === 2 ? "text-orange-400" : "text-purple-400"
                )}
                style={{
                  textShadow: phase === 2
                    ? '0 0 20px rgba(249, 115, 22, 0.8)'
                    : '0 0 15px rgba(139, 92, 246, 0.6)',
                }}
                animate={{
                  scale: phase === 2 ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {displayNumber}
              </motion.span>
            </motion.div>

            {/* Die type label */}
            <p className="text-gray-500 text-xs mt-2">{dieType}</p>
          </div>

          {/* Result card */}
          <AnimatePresence>
            {phase === 2 && (
              <motion.div
                className="bg-[--bg-surface] border border-[--border] rounded-xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Header */}
                <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dice5 className="w-5 h-5 text-orange-400" />
                    <span className="font-medium text-orange-400">Result</span>
                  </div>
                  <span className="text-sm text-gray-400">Rolled {rollValue}</span>
                </div>

                {/* Result text */}
                <div className="p-4">
                  <p className="text-white text-lg leading-relaxed">{resultText}</p>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-[--border] flex justify-between">
                  <button
                    onClick={copyResult}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
