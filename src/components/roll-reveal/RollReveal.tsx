'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Sound URLs (free from Pixabay/Freesound - we'll use Web Audio API for generated sounds)
const useSounds = () => {
  const audioContext = useRef<AudioContext | null>(null)

  const getContext = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext.current
  }, [])

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    try {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      // Audio not supported or blocked
    }
  }, [getContext])

  const playSummon = useCallback(() => {
    // Mystical rising tone
    playTone(150, 0.5, 'sine', 0.2)
    setTimeout(() => playTone(200, 0.4, 'sine', 0.15), 100)
    setTimeout(() => playTone(250, 0.3, 'sine', 0.1), 200)
  }, [playTone])

  const playWhoosh = useCallback(() => {
    // Quick whoosh sound
    const ctx = getContext()
    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)

      filter.type = 'lowpass'
      filter.frequency.value = 1000

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
    } catch (e) {}
  }, [getContext])

  const playChaos = useCallback(() => {
    // Building intensity
    const playNote = (freq: number, delay: number) => {
      setTimeout(() => playTone(freq, 0.1, 'triangle', 0.08), delay)
    }
    for (let i = 0; i < 10; i++) {
      playNote(200 + Math.random() * 400, i * 100)
    }
  }, [playTone])

  const playDraw = useCallback(() => {
    // Sharp magical snap
    playTone(800, 0.1, 'square', 0.15)
    setTimeout(() => playTone(1200, 0.15, 'sine', 0.2), 50)
  }, [playTone])

  const playReveal = useCallback(() => {
    // Triumphant shimmer
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((note, i) => {
      setTimeout(() => playTone(note, 0.4, 'sine', 0.15), i * 80)
    })
  }, [playTone])

  return useMemo(() => ({ playSummon, playWhoosh, playChaos, playDraw, playReveal }), [playSummon, playWhoosh, playChaos, playDraw, playReveal])
}

// Particle component for magical effects
const MagicParticles = ({ active, intensity = 1 }: { active: boolean; intensity?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    size: number
    color: string
    type: 'spark' | 'orb' | 'trail'
  }>>([])
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#F59E0B', '#FBBF24', '#FCD34D']
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const createParticle = () => {
      const angle = Math.random() * Math.PI * 2
      const distance = 50 + Math.random() * 100
      const type: 'spark' | 'orb' | 'trail' = Math.random() > 0.7 ? 'orb' : Math.random() > 0.5 ? 'trail' : 'spark'

      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 2 * intensity,
        vy: (Math.random() - 0.5) * 2 * intensity,
        life: 1,
        maxLife: 0.5 + Math.random() * 1,
        size: type === 'orb' ? 4 + Math.random() * 6 : 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        type,
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Add new particles
      if (Math.random() < 0.3 * intensity) {
        particlesRef.current.push(createParticle())
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.016 / p.maxLife

        if (p.life <= 0) return false

        const alpha = p.life
        ctx.save()

        if (p.type === 'orb') {
          // Soft glowing orb
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          gradient.addColorStop(0, p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'))
          gradient.addColorStop(0.5, p.color + Math.floor(alpha * 128).toString(16).padStart(2, '0'))
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'spark') {
          // Sharp sparkle
          ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
          ctx.shadowColor = p.color
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.moveTo(p.x, p.y - p.size)
          ctx.lineTo(p.x + p.size * 0.3, p.y)
          ctx.lineTo(p.x, p.y + p.size)
          ctx.lineTo(p.x - p.size * 0.3, p.y)
          ctx.closePath()
          ctx.fill()
        } else {
          // Trail dot
          ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
        return true
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [active, intensity])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

// Arcane circle component
const ArcaneCircle = ({ phase, rotation }: { phase: number; rotation: number }) => {
  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ']

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: phase >= 1 ? [0.4, 0.8, 0.4] : 0,
        scale: phase >= 1 ? 1 : 0.5,
        rotate: rotation,
      }}
      transition={{
        opacity: { duration: 2, repeat: Infinity },
        scale: { duration: 0.5 },
        rotate: { duration: 0.1, ease: 'linear' }
      }}
    >
      {/* Outer ring */}
      <div className="absolute w-80 h-80 rounded-full border-2 border-purple-500/50"
        style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.5), inset 0 0 30px rgba(139, 92, 246, 0.3)' }}
      />

      {/* Inner ring */}
      <div className="absolute w-64 h-64 rounded-full border border-purple-400/40"
        style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}
      />

      {/* Runes around the circle */}
      {runes.map((rune, i) => {
        const angle = (i / runes.length) * Math.PI * 2
        const x = Math.cos(angle) * 145
        const y = Math.sin(angle) * 145
        return (
          <motion.span
            key={i}
            className="absolute text-purple-400 text-xl font-bold"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              textShadow: '0 0 10px rgba(139, 92, 246, 0.8)',
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.1,
              repeat: Infinity,
            }}
          >
            {rune}
          </motion.span>
        )
      })}

      {/* Center glow */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
    </motion.div>
  )
}

// Card back design
const CardBack = () => (
  <div className="absolute inset-0 rounded-lg overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
      border: '2px solid rgba(139, 92, 246, 0.5)',
      boxShadow: '0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(139, 92, 246, 0.1)',
    }}
  >
    {/* Decorative pattern */}
    <div className="absolute inset-2 rounded border border-purple-500/30 flex items-center justify-center">
      <div className="w-16 h-16 relative">
        {/* Diamond shape with rune */}
        <div className="absolute inset-0 rotate-45 border-2 border-purple-400/50 rounded-sm"
          style={{ boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-2xl text-purple-400"
          style={{ textShadow: '0 0 10px rgba(139, 92, 246, 0.8)' }}
        >
          ᛟ
        </span>
      </div>
    </div>

    {/* Corner decorations */}
    {[0, 1, 2, 3].map(i => (
      <div
        key={i}
        className="absolute w-6 h-6 border-purple-500/40"
        style={{
          top: i < 2 ? 4 : 'auto',
          bottom: i >= 2 ? 4 : 'auto',
          left: i % 2 === 0 ? 4 : 'auto',
          right: i % 2 === 1 ? 4 : 'auto',
          borderTopWidth: i < 2 ? 2 : 0,
          borderBottomWidth: i >= 2 ? 2 : 0,
          borderLeftWidth: i % 2 === 0 ? 2 : 0,
          borderRightWidth: i % 2 === 1 ? 2 : 0,
        }}
      />
    ))}
  </div>
)

// Floating card component
const FloatingCard = ({
  index,
  total,
  phase,
  isChosen,
  rotation,
}: {
  index: number
  total: number
  phase: number
  isChosen: boolean
  rotation: number
}) => {
  const angle = (index / total) * Math.PI * 2
  const radius = phase >= 3 ? 60 : 120 // Spiral inward during chaos

  // Calculate position based on phase
  const getPosition = () => {
    if (phase < 2) return { x: 0, y: 50, scale: 0, opacity: 0 }
    if (phase === 2) {
      // Cards emerge and fan out
      return {
        x: Math.cos(angle + rotation * 0.01) * radius,
        y: Math.sin(angle + rotation * 0.01) * radius,
        scale: 1,
        opacity: 1,
        rotateY: 0,
      }
    }
    if (phase === 3) {
      // Chaos - spinning faster
      const chaosAngle = angle + rotation * 0.05
      return {
        x: Math.cos(chaosAngle) * (radius - rotation * 0.3),
        y: Math.sin(chaosAngle) * (radius - rotation * 0.3),
        scale: 1,
        opacity: 1,
        rotateY: 0,
      }
    }
    if (phase >= 4 && isChosen) {
      // Chosen card moves to center
      return { x: 0, y: 0, scale: 1.2, opacity: 1, rotateY: phase >= 5 ? 180 : 0 }
    }
    // Other cards scatter
    return {
      x: Math.cos(angle) * 300,
      y: Math.sin(angle) * 300,
      scale: 0.5,
      opacity: 0,
    }
  }

  const pos = getPosition()

  return (
    <motion.div
      className="absolute w-24 h-36"
      style={{
        left: 'calc(50% - 48px)',
        top: 'calc(50% - 72px)',
      }}
      animate={{
        x: pos.x,
        y: pos.y,
        scale: pos.scale,
        opacity: pos.opacity,
        rotateY: pos.rotateY || 0,
      }}
      transition={{
        type: 'spring',
        stiffness: phase >= 4 ? 200 : 100,
        damping: phase >= 4 ? 20 : 15,
        duration: phase >= 4 ? 0.5 : 0.3,
      }}
    >
      <CardBack />

      {/* Glow trail during chaos */}
      {phase === 3 && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(to right, rgba(139, 92, 246, 0.5), transparent)',
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.2, repeat: Infinity }}
        />
      )}

      {/* Chosen card glow */}
      {phase >= 4 && isChosen && (
        <motion.div
          className="absolute -inset-2 rounded-xl"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

export interface RollRevealProps<T> {
  items: T[]
  isOpen: boolean
  onClose: () => void
  onAccept: (item: T) => void
  renderResult: (item: T) => React.ReactNode
  allowReroll?: boolean
  soundEnabled?: boolean
  title?: string
}

export function RollReveal<T>({
  items,
  isOpen,
  onClose,
  onAccept,
  renderResult,
  allowReroll = true,
  soundEnabled = true,
  title = 'The Fates Decide...',
}: RollRevealProps<T>) {
  const [phase, setPhase] = useState(0) // 0: closed, 1: summon, 2: cards emerge, 3: chaos, 4: draw, 5: reveal, 6: result
  const [chosenIndex, setChosenIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const rotationRef = useRef<number | null>(null)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const isAnimatingRef = useRef(false)

  const sounds = useSounds()
  const soundsRef = useRef(sounds)
  soundsRef.current = sounds

  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  const cardCount = Math.min(Math.max(items.length, 5), 7)

  // Clear all pending timeouts
  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(id => clearTimeout(id))
    timeoutsRef.current = []
  }, [])

  // Start the animation sequence
  const startAnimation = useCallback(() => {
    // Clear any existing timeouts first
    clearTimeouts()

    // Prevent multiple simultaneous animations
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true

    setPhase(0)
    setShowResult(false)
    setRotation(0)
    setChosenIndex(Math.floor(Math.random() * items.length))

    // Phase 1: Summon (0.5s)
    timeoutsRef.current.push(setTimeout(() => {
      setPhase(1)
      if (soundEnabledRef.current) soundsRef.current.playSummon()
    }, 100))

    // Phase 2: Cards emerge (0.8s)
    timeoutsRef.current.push(setTimeout(() => {
      setPhase(2)
      if (soundEnabledRef.current) soundsRef.current.playWhoosh()
    }, 600))

    // Phase 3: Chaos (1.5s)
    timeoutsRef.current.push(setTimeout(() => {
      setPhase(3)
      if (soundEnabledRef.current) soundsRef.current.playChaos()
    }, 1400))

    // Phase 4: Draw (0.8s)
    timeoutsRef.current.push(setTimeout(() => {
      setPhase(4)
      if (soundEnabledRef.current) soundsRef.current.playDraw()
    }, 2900))

    // Phase 5: Reveal (0.6s)
    timeoutsRef.current.push(setTimeout(() => {
      setPhase(5)
    }, 3500))

    // Phase 6: Result
    timeoutsRef.current.push(setTimeout(() => {
      setPhase(6)
      setShowResult(true)
      isAnimatingRef.current = false
      if (soundEnabledRef.current) soundsRef.current.playReveal()
    }, 4100))
  }, [items.length, clearTimeouts])

  // Rotation animation during chaos
  useEffect(() => {
    if (phase >= 2 && phase <= 4) {
      const speed = phase === 3 ? 8 : 2
      const animate = () => {
        setRotation(r => r + speed)
        rotationRef.current = requestAnimationFrame(animate)
      }
      rotationRef.current = requestAnimationFrame(animate)
      return () => {
        if (rotationRef.current) cancelAnimationFrame(rotationRef.current)
      }
    }
  }, [phase])

  // Start animation when opened
  useEffect(() => {
    if (isOpen) {
      startAnimation()
    } else {
      clearTimeouts()
      isAnimatingRef.current = false
      setPhase(0)
      setShowResult(false)
    }

    return () => {
      clearTimeouts()
      isAnimatingRef.current = false
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReroll = () => {
    isAnimatingRef.current = false // Allow restart
    startAnimation()
  }

  const handleAccept = () => {
    onAccept(items[chosenIndex])
    onClose()
  }

  const chosenItem = items[chosenIndex]

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion && isOpen) {
    // Simplified version for reduced motion
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="fixed inset-0 bg-black/80" onClick={onClose} />
          <motion.div
            className="relative z-10 bg-[#1a1a24] rounded-2xl p-6 max-w-md w-full"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <h2 className="text-xl font-bold text-white mb-4 text-center">{title}</h2>
            <div className="mb-6">{renderResult(chosenItem)}</div>
            <div className="flex justify-center gap-3">
              {allowReroll && (
                <button
                  onClick={handleReroll}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Roll Again
                </button>
              )}
              <button
                onClick={handleAccept}
                className="btn btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={phase === 6 ? onClose : undefined}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Main container */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Particles */}
            <MagicParticles active={phase >= 1 && phase < 6} intensity={phase === 3 ? 2 : 1} />

            {/* Arcane circle */}
            <ArcaneCircle phase={phase} rotation={rotation} />

            {/* Floating cards */}
            {Array.from({ length: cardCount }).map((_, i) => (
              <FloatingCard
                key={i}
                index={i}
                total={cardCount}
                phase={phase}
                isChosen={i === chosenIndex % cardCount}
                rotation={rotation}
              />
            ))}

            {/* Title */}
            <motion.h2
              className="absolute top-20 text-2xl md:text-3xl font-bold text-purple-300"
              style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.8)' }}
              initial={{ opacity: 0, y: -20 }}
              animate={{
                opacity: phase >= 1 && phase < 6 ? 1 : 0,
                y: phase >= 1 ? 0 : -20,
              }}
            >
              {title}
            </motion.h2>

            {/* Result card */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  className="absolute z-20 max-w-md w-full mx-4"
                  initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    delay: 0.2,
                  }}
                >
                  {/* Mystical outer glow */}
                  <motion.div
                    className="absolute -inset-6 rounded-3xl"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.4) 0%, rgba(168, 85, 247, 0.2) 40%, transparent 70%)',
                      filter: 'blur(25px)',
                    }}
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Card frame */}
                  <div
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 20, 50, 0.98) 50%, rgba(139, 92, 246, 0.1) 100%)',
                      boxShadow: `
                        0 0 0 1px rgba(139, 92, 246, 0.3),
                        0 0 0 2px rgba(168, 85, 247, 0.2),
                        0 0 30px rgba(139, 92, 246, 0.4),
                        0 0 60px rgba(139, 92, 246, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1)
                      `,
                    }}
                  >
                    {/* Animated border glow */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={{
                        backgroundPosition: ['200% 0', '-200% 0'],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Corner ornaments */}
                    <svg className="absolute top-0 left-0 w-12 h-12 text-purple-400/60" viewBox="0 0 48 48">
                      <path d="M0 24 L0 8 Q0 0 8 0 L24 0" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="8" r="2" fill="currentColor"/>
                      <path d="M4 16 L4 4 L16 4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                    </svg>
                    <svg className="absolute top-0 right-0 w-12 h-12 text-purple-400/60 rotate-90" viewBox="0 0 48 48">
                      <path d="M0 24 L0 8 Q0 0 8 0 L24 0" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="8" r="2" fill="currentColor"/>
                      <path d="M4 16 L4 4 L16 4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                    </svg>
                    <svg className="absolute bottom-0 left-0 w-12 h-12 text-purple-400/60 -rotate-90" viewBox="0 0 48 48">
                      <path d="M0 24 L0 8 Q0 0 8 0 L24 0" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="8" r="2" fill="currentColor"/>
                      <path d="M4 16 L4 4 L16 4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                    </svg>
                    <svg className="absolute bottom-0 right-0 w-12 h-12 text-purple-400/60 rotate-180" viewBox="0 0 48 48">
                      <path d="M0 24 L0 8 Q0 0 8 0 L24 0" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="8" r="2" fill="currentColor"/>
                      <path d="M4 16 L4 4 L16 4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                    </svg>

                    {/* Mystical watermark pattern */}
                    <div
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L35 25 L55 30 L35 35 L30 55 L25 35 L5 30 L25 25 Z' fill='%238B5CF6' fill-opacity='0.5'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%238B5CF6' stroke-opacity='0.3'/%3E%3C/svg%3E")`,
                        backgroundSize: '60px 60px',
                      }}
                    />

                    {/* Header banner */}
                    <div className="relative">
                      <div
                        className="h-12 flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 100%)',
                          borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                          }}
                          animate={{ backgroundPosition: ['100% 0', '-100% 0'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                        />
                        <span className="text-sm font-medium tracking-widest uppercase text-purple-300/80">
                          Fate Revealed
                        </span>
                      </div>
                      {/* Banner edge decoration */}
                      <svg className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 text-purple-500/40" viewBox="0 0 96 12">
                        <path d="M0 0 L48 12 L96 0" fill="none" stroke="currentColor" strokeWidth="1"/>
                        <circle cx="48" cy="10" r="2" fill="currentColor"/>
                      </svg>
                    </div>

                    {/* Content area */}
                    <div className="relative p-6 pt-8">
                      {/* Subtle inner glow */}
                      <div
                        className="absolute inset-4 rounded-lg pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
                        }}
                      />

                      <div className="relative">
                        {renderResult(chosenItem)}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div
                      className="relative flex justify-center gap-3 p-4 pt-2"
                      style={{
                        borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                        background: 'linear-gradient(0deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%)',
                      }}
                    >
                      {allowReroll && (
                        <motion.button
                          onClick={handleReroll}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-purple-300 font-medium transition-all"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
                          }}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Roll Again
                        </motion.button>
                      )}
                      <motion.button
                        onClick={handleAccept}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #8B5CF6 100%)',
                          boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                          color: 'white',
                        }}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: '0 0 35px rgba(139, 92, 246, 0.7), inset 0 1px 0 rgba(255,255,255,0.2)',
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Check className="w-4 h-4" />
                        Accept Fate
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
