import { Resend } from 'resend'

// Lazy initialize Resend to avoid build-time errors
let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = 'Multiloop <noreply@multiloop.app>'
const SUPPORT_EMAIL = 'contact@multiloop.app'

// Use emoji icons instead of SVGs - they work reliably across all email clients
// The emoji is wrapped in a styled container for visual consistency
const EMAIL_ICONS = {
  verify: '✓',
  lock: '🔒',
  invite: '✉️',
  shield: '🛡️',
  shieldOff: '⚠️',
  mail: '📧',
}

// Icon container that works in both light and dark mode
function emailIcon(icon: string, bgColor: string): string {
  return `
    <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; text-align: center; font-size: 28px; background-color: ${bgColor}; border-radius: 50%;">
      ${icon}
    </div>
  `
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const client = getResendClient()
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

// Strip HTML for plain text version
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Email template wrapper with Multiloop branding
// Uses dark mode protection techniques for Gmail iOS/Android
function emailWrapper(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Multiloop</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#0a0a0f;max-height:0px;overflow:hidden;mso-hide:all;">${preheader}</span>` : ''}
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    /* Prevent auto-linking on iOS */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
    }
    /* Dark mode overrides - prevent Gmail from inverting our already-dark design */
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #0a0a0f !important; }
      .dark-mode-card { background-color: #1a1a24 !important; }
    }
    /* Gmail dark mode specific */
    u + .body .dark-mode-bg { background-color: #0a0a0f !important; }
    u + .body .dark-mode-card { background-color: #1a1a24 !important; }
  </style>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .mso-padding {padding: 20px 30px;}
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body class="body" style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader || ''}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="dark-mode-bg" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://multiloop.app/icons/icon-192x192.png" alt="Multiloop" width="64" height="64" style="display: block; border-radius: 16px;">
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td class="dark-mode-card" style="background-color: #1a1a24; border-radius: 24px; border: 1px solid #2a2a3a;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 40px;" class="mso-padding">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af;">
                Forge stories. Track adventures. Remember legends.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                <a href="https://multiloop.app" style="color: #a78bfa; text-decoration: none;">multiloop.app</a>
                &nbsp;&bull;&nbsp;
                <a href="https://multiloop.app/privacy" style="color: #9ca3af; text-decoration: none;">Privacy</a>
                &nbsp;&bull;&nbsp;
                <a href="https://multiloop.app/terms" style="color: #9ca3af; text-decoration: none;">Terms</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #6b7280;">
                Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #a78bfa; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// Button component for emails
// Uses solid colors for reliable dark mode support
function emailButton(text: string, href: string, primary = true): string {
  // Primary: solid purple bg with white text
  // Secondary: dark bg with purple border and light purple text
  const bgColor = primary ? '#8b5cf6' : '#1a1a24'
  const textColor = primary ? '#ffffff' : '#c4b5fd'
  const border = primary ? 'none' : '2px solid #8b5cf6'

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
      <tr>
        <td style="border-radius: 12px; background-color: ${bgColor}; border: ${border};">
          <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: ${textColor}; text-decoration: none; border-radius: 12px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `
}

// Divider - use solid color instead of rgba for better dark mode support
function emailDivider(): string {
  return `<hr style="border: none; border-top: 1px solid #2a2a3a; margin: 24px 0;">`
}

// =====================
// Email Templates
// =====================

export function welcomeEmail(userName: string): { subject: string; html: string } {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center;">
      Welcome to Multiloop!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #b4b4b4; text-align: center;">
      Your adventure begins now, ${userName || 'Adventurer'}
    </p>

    ${emailDivider()}

    <div style="margin: 0 0 24px 0; padding: 16px; background-color: #2d2b55; border-radius: 12px; border: 1px solid #4a4880;">
      <p style="margin: 0; font-size: 14px; color: #e5e5e5; text-align: center;">
        <strong style="color: #c4b5fd;">Important:</strong> Please confirm your email address using the separate confirmation email we sent, then you can sign in.
      </p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      You've just joined a community of dungeon masters and players who are passionate about crafting memorable tabletop adventures.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      With Multiloop, you can:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #e5e5e5; font-size: 15px; line-height: 1.8;">
      <li>Create and manage your campaigns</li>
      <li>Track characters, NPCs, and their stories</li>
      <li>Log detailed session notes</li>
      <li>Build timelines and lore for your world</li>
      <li>Share campaigns with your players</li>
    </ul>

    <p style="margin: 0 0 8px 0; font-size: 13px; color: #fcd34d; text-align: center; font-weight: 500;">
      Multiloop is currently in Beta
    </p>
    <p style="margin: 0 0 0 0; font-size: 13px; color: #888888; text-align: center;">
      We're actively improving based on feedback. Found a bug or have a suggestion? Let us know!
    </p>
  `

  return {
    subject: 'Welcome to Multiloop - Your Adventure Awaits!',
    html: emailWrapper(content, 'Your D&D campaign management journey begins now!')
  }
}

export function verificationEmail(verifyUrl: string): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.verify, '#2d2b55')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Verify Your Email
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      One quick step to unlock your account
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      Click the button below to verify your email address and complete your account setup.
    </p>

    ${emailButton('Verify Email Address', verifyUrl)}

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #888888; text-align: center;">
      This link will expire in 24 hours.
    </p>

    ${emailDivider()}

    <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
      If you didn't create an account on Multiloop, you can safely ignore this email.
    </p>
  `

  return {
    subject: 'Verify your Multiloop email address',
    html: emailWrapper(content, 'Please verify your email to complete your Multiloop account setup')
  }
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.lock, '#3d2020')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      We received a request to reset your password
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      Click the button below to create a new password. If you didn't request this, you can safely ignore this email.
    </p>

    ${emailButton('Reset Password', resetUrl)}

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #888888; text-align: center;">
      This link will expire in 1 hour for security reasons.
    </p>

    ${emailDivider()}

    <div style="background-color: #3d2020; border: 1px solid #5c3030; border-radius: 12px; padding: 16px;">
      <p style="margin: 0; font-size: 13px; color: #fca5a5; text-align: center;">
        <strong>Security Tip:</strong> Never share this link with anyone. Multiloop will never ask for your password.
      </p>
    </div>
  `

  return {
    subject: 'Reset your Multiloop password',
    html: emailWrapper(content, 'Password reset requested for your Multiloop account')
  }
}

export function inviteCodeEmail(code: string, inviterName?: string): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.invite, '#2d2b55')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      You're Invited!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      ${inviterName ? `${inviterName} has invited you to join Multiloop` : 'You have been invited to join Multiloop'}
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 24px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      Multiloop is a campaign management tool for tabletop RPG enthusiasts. Track your campaigns, characters, and epic adventures all in one place.
    </p>

    <div style="background-color: #2d2b55; border: 1px solid #4a4880; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #b4b4b4; text-transform: uppercase; letter-spacing: 1px;">
        Your Invite Code
      </p>
      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #c4b5fd; letter-spacing: 4px; font-family: monospace;">
        ${code}
      </p>
    </div>

    ${emailButton('Join Multiloop', `https://multiloop.app/login?invite=${code}`)}

    <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
      This invite code is for single use only.
    </p>
  `

  return {
    subject: inviterName ? `${inviterName} invited you to Multiloop` : 'You\'ve been invited to Multiloop!',
    html: emailWrapper(content, 'You\'ve been invited to join Multiloop - the ultimate D&D campaign manager')
  }
}

export function twoFactorEnabledEmail(): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.shield, '#1a3d2a')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      2FA Enabled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #86efac; text-align: center;">
      Your account is now more secure
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      Two-factor authentication has been successfully enabled on your Multiloop account. From now on, you'll need your authenticator app code when signing in.
    </p>

    <div style="background-color: #1a3d2a; border: 1px solid #2d5a3d; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #86efac; font-weight: 600;">
        Remember to keep your backup codes safe!
      </p>
      <p style="margin: 0; font-size: 13px; color: #b4b4b4;">
        Store them in a secure location. You'll need them if you lose access to your authenticator app.
      </p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
      If you didn't enable 2FA, please contact us immediately at ${SUPPORT_EMAIL}
    </p>
  `

  return {
    subject: 'Two-factor authentication enabled on your Multiloop account',
    html: emailWrapper(content, '2FA has been enabled on your Multiloop account')
  }
}

export function twoFactorDisabledEmail(): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.shieldOff, '#3d2020')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      2FA Disabled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #fca5a5; text-align: center;">
      Two-factor authentication has been removed
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      Two-factor authentication has been disabled on your Multiloop account. Your account is now protected only by your password.
    </p>

    <div style="background-color: #3d2020; border: 1px solid #5c3030; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 13px; color: #fca5a5;">
        <strong>We recommend enabling 2FA</strong> to add an extra layer of security to your account.
      </p>
    </div>

    ${emailButton('Re-enable 2FA', 'https://multiloop.app/settings/security', false)}

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #888888; text-align: center;">
      If you didn't disable 2FA, please secure your account immediately and contact us at ${SUPPORT_EMAIL}
    </p>
  `

  return {
    subject: 'Two-factor authentication disabled on your Multiloop account',
    html: emailWrapper(content, '2FA has been disabled on your Multiloop account')
  }
}

// Email sent when user REQUESTS deletion (starts 14-day grace period)
export function accountDeletionScheduledEmail(options: {
  userName: string
  deletionDate: string
  cancelUrl: string
}): { subject: string; html: string } {
  const { userName, deletionDate, cancelUrl } = options

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon('⏳', '#3d3020')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Account Deletion Scheduled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      ${userName || 'Adventurer'}, your request has been received
    </p>

    ${emailDivider()}

    <div style="background-color: #3d3020; border: 1px solid #5c4a30; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #fcd34d; text-transform: uppercase; letter-spacing: 1px;">
        Your account will be permanently deleted on
      </p>
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
        ${deletionDate}
      </p>
      <p style="margin: 12px 0 0 0; font-size: 14px; color: #d4a574;">
        14 days from now
      </p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      We've scheduled your account for deletion. During this 14-day grace period:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #e5e5e5; font-size: 15px; line-height: 1.8;">
      <li>You <strong>cannot</strong> access your account</li>
      <li>Your data is <strong>not</strong> being deleted yet</li>
      <li>You <strong>can</strong> cancel and restore your account anytime</li>
    </ul>

    <p style="margin: 0 0 8px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      <strong>Changed your mind?</strong>
    </p>

    ${emailButton('Cancel Deletion & Restore Account', cancelUrl)}

    ${emailDivider()}

    <div style="background-color: #2d2020; border: 1px solid #4a3030; border-radius: 12px; padding: 16px;">
      <p style="margin: 0; font-size: 13px; color: #fca5a5; text-align: center;">
        After ${deletionDate}, your account and all data will be <strong>permanently deleted</strong> and cannot be recovered.
      </p>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #888888; text-align: center;">
      If you didn't request this deletion, please cancel immediately and secure your account.
    </p>
  `

  return {
    subject: 'Your Multiloop account is scheduled for deletion',
    html: emailWrapper(content, `Your Multiloop account will be deleted on ${deletionDate}. You have 14 days to cancel.`)
  }
}

// Email sent 2 days before permanent deletion (reminder)
export function accountDeletionReminderEmail(options: {
  userName: string
  deletionDate: string
  cancelUrl: string
}): { subject: string; html: string } {
  const { userName, deletionDate, cancelUrl } = options

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon('⚠️', '#3d2020')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Final Reminder
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #fca5a5; text-align: center;">
      Your account will be permanently deleted in 2 days
    </p>

    ${emailDivider()}

    <div style="background-color: #3d2020; border: 1px solid #5c3030; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #fca5a5; text-transform: uppercase; letter-spacing: 1px;">
        Permanent deletion date
      </p>
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
        ${deletionDate}
      </p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      Hi ${userName || 'Adventurer'},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      This is a final reminder that your Multiloop account is scheduled to be <strong>permanently deleted</strong> on <strong>${deletionDate}</strong>.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      Once deleted, <strong>all your data will be gone forever</strong>, including:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #e5e5e5; font-size: 15px; line-height: 1.8;">
      <li>All campaigns and session notes</li>
      <li>All characters (vault and campaign)</li>
      <li>All oneshots and templates</li>
      <li>Your account settings and preferences</li>
    </ul>

    <p style="margin: 0 0 8px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      <strong>This is your last chance to cancel.</strong>
    </p>

    ${emailButton('Cancel Deletion & Keep My Account', cancelUrl)}

    ${emailDivider()}

    <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
      If you still want to delete your account, no action is needed. Deletion will proceed automatically.
    </p>
  `

  return {
    subject: 'FINAL REMINDER: Your Multiloop account will be deleted in 2 days',
    html: emailWrapper(content, `Last chance! Your Multiloop account will be permanently deleted on ${deletionDate}`)
  }
}

// Email sent AFTER permanent deletion is complete
export function accountDeletedEmail(userName: string): { subject: string; html: string } {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Account Permanently Deleted
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      Goodbye, ${userName || 'Adventurer'}
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      Your Multiloop account and all associated data have been <strong>permanently deleted</strong>. This cannot be undone.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      The following has been removed:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #b4b4b4; font-size: 14px; line-height: 1.8;">
      <li>Your account and login credentials</li>
      <li>All campaigns and session notes</li>
      <li>All characters and their data</li>
      <li>All oneshots and templates</li>
      <li>All uploaded images and files</li>
    </ul>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6;">
      We hope you enjoyed your time with Multiloop. If you ever want to return, you're welcome to create a new account at any time.
    </p>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #888888; text-align: center;">
      Thank you for being part of our community. May your future adventures be legendary!
    </p>
  `

  return {
    subject: 'Your Multiloop account has been permanently deleted',
    html: emailWrapper(content, 'Your Multiloop account and all data have been permanently deleted')
  }
}

export function waitlistConfirmationEmail(verifyUrl: string): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.mail, '#2d2b55')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Confirm Your Spot
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      One click to join the Multiloop waitlist
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      Thanks for your interest in Multiloop! Click the button below to confirm your email address and secure your spot on the waitlist.
    </p>

    ${emailButton('Confirm My Spot', verifyUrl)}

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #888888; text-align: center;">
      This link will expire in 24 hours.
    </p>

    ${emailDivider()}

    <div style="background-color: #2d2b55; border: 1px solid #4a4880; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #c4b5fd; font-weight: 600; text-align: center;">
        What happens next?
      </p>
      <p style="margin: 0; font-size: 13px; color: #b4b4b4; text-align: center;">
        Once confirmed, you'll receive an invite when we're ready to welcome more adventurers. We're currently in closed beta with an open beta planned for Q1 2026.
      </p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
      If you didn't sign up for the Multiloop waitlist, you can safely ignore this email.
    </p>
  `

  return {
    subject: 'Confirm your spot on the Multiloop waitlist',
    html: emailWrapper(content, 'Please confirm your email to join the Multiloop waitlist')
  }
}

export function campaignInviteEmail(options: {
  campaignName: string
  inviterName: string
  role: string
  inviteUrl: string
  characterName?: string
}): { subject: string; html: string } {
  const { campaignName, inviterName, role, inviteUrl, characterName } = options

  const roleDescriptions: Record<string, string> = {
    co_dm: 'Co-DM with full access to manage the campaign',
    player: 'Player who can view campaign content and add session notes',
    contributor: 'Contributor who can add session notes',
    guest: 'Guest with view-only access',
  }

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailIcon(EMAIL_ICONS.invite, '#2d2b55')}
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      You're Invited!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #b4b4b4; text-align: center;">
      ${inviterName} has invited you to join a campaign
    </p>

    ${emailDivider()}

    <div style="background-color: #2d2b55; border: 1px solid #4a4880; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #b4b4b4; text-transform: uppercase; letter-spacing: 1px;">
        Campaign
      </p>
      <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
        ${campaignName}
      </p>
      <p style="margin: 0; font-size: 14px; color: #c4b5fd;">
        Role: <strong>${role.charAt(0).toUpperCase() + role.slice(1).replace('_', '-')}</strong>
      </p>
      ${characterName ? `
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #b4b4b4;">
          Playing as: <strong style="color: #ffffff;">${characterName}</strong>
        </p>
      ` : ''}
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e5e5; line-height: 1.6; text-align: center;">
      ${roleDescriptions[role] || 'Join this campaign to collaborate on adventures!'}
    </p>

    ${emailButton('Join Campaign', inviteUrl)}

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #888888; text-align: center;">
      This invite link is unique to you. Don't share it with others.
    </p>

    ${emailDivider()}

    <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
      Multiloop is a campaign management tool for tabletop RPGs. Track campaigns, characters, session notes, and more.
    </p>
  `

  return {
    subject: `${inviterName} invited you to join "${campaignName}" on Multiloop`,
    html: emailWrapper(content, `You've been invited to join the ${campaignName} campaign on Multiloop`)
  }
}

export { SUPPORT_EMAIL }
