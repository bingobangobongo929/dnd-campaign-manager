import { TOTP, Secret } from 'otpauth'

const ISSUER = 'Multiloop'
const ALGORITHM = 'SHA1'
const DIGITS = 6
const PERIOD = 30

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  const secret = new Secret({ size: 20 })
  return secret.base32
}

/**
 * Create a TOTP instance
 */
export function createTOTP(email: string, secret: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(secret),
  })
}

/**
 * Generate TOTP URI for QR code
 */
export function generateTOTPUri(email: string, secret: string): string {
  const totp = createTOTP(email, secret)
  return totp.toString()
}

/**
 * Verify a TOTP token
 */
export function verifyTOTPToken(secret: string, token: string, email: string): boolean {
  const totp = createTOTP(email, secret)
  // Window of 1 means we accept tokens from 30 seconds before/after current time
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}

/**
 * Hash a backup code for storage (simple hash, could use bcrypt for more security)
 */
export function hashBackupCode(code: string): string {
  // Remove dashes and convert to uppercase for comparison
  return code.replace(/-/g, '').toUpperCase()
}

/**
 * Verify a backup code against stored hashed codes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const normalizedCode = hashBackupCode(code)
  return hashedCodes.findIndex(hashed => hashed === normalizedCode)
}
