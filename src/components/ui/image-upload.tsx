'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  name = 'Upload',
  size = 'lg',
  className,
  disabled = false,
}: ImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizes = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
    xl: 'h-24 w-24',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7',
  }

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // For now, create a local object URL as placeholder
      // In production, this would upload to Supabase Storage
      const objectUrl = URL.createObjectURL(file)
      onChange(objectUrl)

      // TODO: Implement actual Supabase Storage upload
      // const { data, error } = await supabase.storage
      //   .from('avatars')
      //   .upload(`${Date.now()}-${file.name}`, file)
      // if (data) {
      //   const { data: { publicUrl } } = supabase.storage
      //     .from('avatars')
      //     .getPublicUrl(data.path)
      //   onChange(publicUrl)
      // }
    } catch (err) {
      setError('Failed to upload image')
      console.error('Upload error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [onChange])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onChange])

  return (
    <div className={cn('relative group', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isLoading}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          'relative rounded-full overflow-hidden transition-all',
          'focus:outline-none focus:ring-2 focus:ring-[--accent-primary] focus:ring-offset-2 focus:ring-offset-[--bg-surface]',
          sizes[size],
          value
            ? 'border-2 border-[--border]'
            : 'border-2 border-dashed border-[--text-tertiary] hover:border-[--accent-primary]',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={name}
              fill
              className="object-cover"
            />
            {/* Hover overlay */}
            <div className={cn(
              'absolute inset-0 bg-black/60 flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              disabled && 'hidden'
            )}>
              <Camera className={cn('text-white', iconSizes[size])} />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[--bg-hover]">
            {isLoading ? (
              <Loader2 className={cn('text-[--text-secondary] animate-spin', iconSizes[size])} />
            ) : (
              <Camera className={cn('text-[--text-tertiary] group-hover:text-[--accent-primary] transition-colors', iconSizes[size])} />
            )}
          </div>
        )}
      </button>

      {/* Remove button */}
      {value && !disabled && !isLoading && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'absolute -top-1 -right-1 p-1 rounded-full',
            'bg-[--bg-surface] border border-[--border]',
            'text-[--text-secondary] hover:text-[--arcane-ember] hover:border-[--arcane-ember]',
            'opacity-0 group-hover:opacity-100 transition-all',
            'focus:outline-none focus:opacity-100'
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Error message */}
      {error && (
        <p className="absolute -bottom-5 left-0 right-0 text-center text-xs text-[--arcane-ember]">
          {error}
        </p>
      )}
    </div>
  )
}
