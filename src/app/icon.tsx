import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          borderRadius: '6px',
        }}
      >
        {/* D20-inspired design */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
        >
          {/* Hexagonal D20 shape */}
          <path
            d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
            fill="rgba(255,255,255,0.15)"
            stroke="white"
            strokeWidth="1.5"
          />
          {/* Inner facet lines */}
          <path d="M12 2L12 12M3 7L12 12M21 7L12 12M12 22L12 12M3 17L12 12M21 17L12 12" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
          {/* Center dot */}
          <circle cx="12" cy="12" r="2" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
