import Link from 'next/link'

interface LegalFooterProps {
  className?: string
  showChangelog?: boolean
}

export function LegalFooter({ className = '', showChangelog = true }: LegalFooterProps) {
  return (
    <footer className={`text-center text-xs text-gray-500 ${className}`}>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Link
          href="/privacy"
          className="hover:text-gray-400 transition-colors"
        >
          Privacy Policy
        </Link>
        <span className="text-gray-700">·</span>
        <Link
          href="/terms"
          className="hover:text-gray-400 transition-colors"
        >
          Terms of Service
        </Link>
        <span className="text-gray-700">·</span>
        <Link
          href="/cookies"
          className="hover:text-gray-400 transition-colors"
        >
          Cookies
        </Link>
        {showChangelog && (
          <>
            <span className="text-gray-700">·</span>
            <Link
              href="/changelog"
              className="hover:text-gray-400 transition-colors"
            >
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
