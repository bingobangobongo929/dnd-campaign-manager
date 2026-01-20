import Link from 'next/link'

interface LegalFooterProps {
  className?: string
  showChangelog?: boolean
}

export function LegalFooter({ className = '', showChangelog = true }: LegalFooterProps) {
  const linkClass = "text-gray-400 hover:text-white underline underline-offset-2 decoration-gray-600 hover:decoration-gray-400 transition-colors cursor-pointer"

  return (
    <footer className={`text-center text-xs text-gray-500 relative z-50 ${className}`}>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/privacy" className={linkClass}>
          Privacy Policy
        </Link>
        <span className="text-gray-700">·</span>
        <Link href="/terms" className={linkClass}>
          Terms of Service
        </Link>
        <span className="text-gray-700">·</span>
        <Link href="/cookies" className={linkClass}>
          Cookies
        </Link>
        {showChangelog && (
          <>
            <span className="text-gray-700">·</span>
            <Link href="/changelog" className={linkClass}>
              What's New
            </Link>
          </>
        )}
      </div>
      <p className="mt-2 text-gray-600">
        © {new Date().getFullYear()} Multiloop. All rights reserved.
      </p>
    </footer>
  )
}
