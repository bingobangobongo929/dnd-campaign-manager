import { TOTP, Secret } from 'otpauth'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const ISSUER = 'Multiloop'
const ALGORITHM = 'SHA1'
const DIGITS = 6
const PERIOD = 30
const BCRYPT_ROUNDS = 10

// Encryption key for TOTP secrets - should be 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  const secret = new Secret({ size: 20 })
  return secret.base32
}

/**
 * Encrypt a TOTP secret for storage
 */
export function encryptTOTPSecret(secret: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a TOTP secret from storage
 */
export function decryptTOTPSecret(encryptedSecret: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const parts = encryptedSecret.split(':')

  if (parts.length !== 3) {
    // Legacy unencrypted secret - return as-is for backward compatibility
    // In production, you should migrate all secrets to encrypted format
    return encryptedSecret
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
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
 * Verify a TOTP token with timing-safe comparison
 */
export function verifyTOTPToken(encryptedSecret: string, token: string, email: string): boolean {
  try {
    // Decrypt the secret first
    const secret = decryptTOTPSecret(encryptedSecret)
    const totp = createTOTP(email, secret)

    // Window of 1 means we accept tokens from 30 seconds before/after current time
    const delta = totp.validate({ token, window: 1 })
    return delta !== null
  } catch (error) {
    console.error('TOTP verification error:', error)
    return false
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    // Use crypto for secure random generation
    const randomBytes = crypto.randomBytes(4)
    const code = randomBytes.toString('hex').toUpperCase().slice(0, 8)
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}

/**
 * Hash a backup code for storage using bcrypt
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Normalize: remove dashes and convert to uppercase
  const normalizedCode = code.replace(/-/g, '').toUpperCase()
  return bcrypt.hash(normalizedCode, BCRYPT_ROUNDS)
}

/**
 * Hash multiple backup codes
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => hashBackupCode(code)))
}

/**
 * Verify a backup code against stored hashed codes using timing-safe comparison
 * Returns the index of the matched code, or -1 if not found
 */
export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
  // Normalize: remove dashes and convert to uppercase
  const normalizedCode = code.replace(/-/g, '').toUpperCase()

  // Check against all codes to prevent timing attacks
  // We check ALL codes regardless of early matches to ensure constant time
  const results = await Promise.all(
    hashedCodes.map(async (hashedCode, index) => {
      try {
        const matches = await bcrypt.compare(normalizedCode, hashedCode)
        return matches ? index : -1
      } catch {
        return -1
      }
    })
  )

  // Find the first matching index
  return results.find(index => index !== -1) ?? -1
}

/**
 * Legacy hash function for backward compatibility during migration
 * @deprecated Use hashBackupCode instead
 */
export function legacyHashBackupCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase()
}

/**
 * Check if a code is in legacy format (not bcrypt hashed)
 */
export function isLegacyBackupCode(hashedCode: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, or $2y$
  return !hashedCode.startsWith('$2')
}

/**
 * Verify backup code with legacy fallback
 */
export async function verifyBackupCodeWithLegacy(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  const normalizedCode = code.replace(/-/g, '').toUpperCase()

  // Check each code, handling both legacy and bcrypt formats
  for (let i = 0; i < hashedCodes.length; i++) {
    const hashedCode = hashedCodes[i]

    if (isLegacyBackupCode(hashedCode)) {
      // Legacy comparison with timing-safe check
      const legacyNormalized = Buffer.from(hashedCode)
      const inputBuffer = Buffer.from(normalizedCode)

      if (legacyNormalized.length === inputBuffer.length) {
        if (crypto.timingSafeEqual(legacyNormalized, inputBuffer)) {
          return i
        }
      }
    } else {
      // Bcrypt comparison
      try {
        const matches = await bcrypt.compare(normalizedCode, hashedCode)
        if (matches) {
          return i
        }
      } catch {
        // Continue checking other codes
      }
    }
  }

  return -1
}
