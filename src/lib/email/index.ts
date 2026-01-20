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
function emailWrapper(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Multiloop</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#0a0a0f;max-height:0px;overflow:hidden;">${preheader}</span>` : ''}
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .mso-padding {padding: 20px 30px;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0f;">
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
            <td style="background: linear-gradient(145deg, #1a1a24 0%, #12121a 100%); border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
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
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                Forge stories. Track adventures. Remember legends.
              </p>
              <p style="margin: 0; font-size: 12px; color: #4b5563;">
                <a href="https://multiloop.app" style="color: #8b5cf6; text-decoration: none;">multiloop.app</a>
                &nbsp;&bull;&nbsp;
                <a href="https://multiloop.app/privacy" style="color: #6b7280; text-decoration: none;">Privacy</a>
                &nbsp;&bull;&nbsp;
                <a href="https://multiloop.app/terms" style="color: #6b7280; text-decoration: none;">Terms</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #374151;">
                Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #8b5cf6; text-decoration: none;">${SUPPORT_EMAIL}</a>
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
function emailButton(text: string, href: string, primary = true): string {
  const bgColor = primary ? '#8b5cf6' : 'transparent'
  const textColor = primary ? '#ffffff' : '#8b5cf6'
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

// Divider
function emailDivider(): string {
  return `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;">`
}

// =====================
// Email Templates
// =====================

export function welcomeEmail(userName: string): { subject: string; html: string } {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center;">
      Welcome to Multiloop!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #9ca3af; text-align: center;">
      Your adventure begins now, ${userName || 'Adventurer'}
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
      You've just joined a community of dungeon masters and players who are passionate about crafting memorable tabletop adventures.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
      With Multiloop, you can:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #d1d5db; font-size: 15px; line-height: 1.8;">
      <li>Create and manage your campaigns</li>
      <li>Track characters, NPCs, and their stories</li>
      <li>Log sessions with AI-powered summaries</li>
      <li>Build timelines and lore for your world</li>
      <li>Import characters from D&D Beyond</li>
    </ul>

    ${emailButton('Start Your First Campaign', 'https://multiloop.app/home')}

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; text-align: center;">
      Need help getting started? Check out our guide or reach out anytime.
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
      <div style="display: inline-block; padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 50%;">
        <img src="https://multiloop.app/email/verify-icon.png" alt="" width="32" height="32" style="display: block;" onerror="this.style.display='none'">
      </div>
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Verify Your Email
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #9ca3af; text-align: center;">
      One quick step to unlock your account
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6; text-align: center;">
      Click the button below to verify your email address and complete your account setup.
    </p>

    ${emailButton('Verify Email Address', verifyUrl)}

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280; text-align: center;">
      This link will expire in 24 hours.
    </p>

    ${emailDivider()}

    <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
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
      <div style="display: inline-block; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 50%;">
        <img src="https://multiloop.app/email/lock-icon.png" alt="" width="32" height="32" style="display: block;" onerror="this.style.display='none'">
      </div>
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #9ca3af; text-align: center;">
      We received a request to reset your password
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6; text-align: center;">
      Click the button below to create a new password. If you didn't request this, you can safely ignore this email.
    </p>

    ${emailButton('Reset Password', resetUrl)}

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280; text-align: center;">
      This link will expire in 1 hour for security reasons.
    </p>

    ${emailDivider()}

    <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 16px;">
      <p style="margin: 0; font-size: 13px; color: #f87171; text-align: center;">
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
      <div style="display: inline-block; padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 50%;">
        <img src="https://multiloop.app/email/invite-icon.png" alt="" width="32" height="32" style="display: block;" onerror="this.style.display='none'">
      </div>
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      You're Invited!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #9ca3af; text-align: center;">
      ${inviterName ? `${inviterName} has invited you to join Multiloop` : 'You have been invited to join Multiloop'}
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 24px 0; font-size: 15px; color: #d1d5db; line-height: 1.6; text-align: center;">
      Multiloop is a campaign management tool for tabletop RPG enthusiasts. Track your campaigns, characters, and epic adventures all in one place.
    </p>

    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">
        Your Invite Code
      </p>
      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #8b5cf6; letter-spacing: 4px; font-family: monospace;">
        ${code}
      </p>
    </div>

    ${emailButton('Join Multiloop', `https://multiloop.app/login?invite=${code}`)}

    <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
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
      <div style="display: inline-block; padding: 16px; background: rgba(34, 197, 94, 0.1); border-radius: 50%;">
        <img src="https://multiloop.app/email/shield-icon.png" alt="" width="32" height="32" style="display: block;" onerror="this.style.display='none'">
      </div>
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      2FA Enabled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #22c55e; text-align: center;">
      Your account is now more secure
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
      Two-factor authentication has been successfully enabled on your Multiloop account. From now on, you'll need your authenticator app code when signing in.
    </p>

    <div style="background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #22c55e; font-weight: 600;">
        Remember to keep your backup codes safe!
      </p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">
        Store them in a secure location. You'll need them if you lose access to your authenticator app.
      </p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
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
      <div style="display: inline-block; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 50%;">
        <img src="https://multiloop.app/email/shield-off-icon.png" alt="" width="32" height="32" style="display: block;" onerror="this.style.display='none'">
      </div>
    </div>

    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      2FA Disabled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #f87171; text-align: center;">
      Two-factor authentication has been removed
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
      Two-factor authentication has been disabled on your Multiloop account. Your account is now protected only by your password.
    </p>

    <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 13px; color: #f87171;">
        <strong>We recommend enabling 2FA</strong> to add an extra layer of security to your account.
      </p>
    </div>

    ${emailButton('Re-enable 2FA', 'https://multiloop.app/settings/security', false)}

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">
      If you didn't disable 2FA, please secure your account immediately and contact us at ${SUPPORT_EMAIL}
    </p>
  `

  return {
    subject: 'Two-factor authentication disabled on your Multiloop account',
    html: emailWrapper(content, '2FA has been disabled on your Multiloop account')
  }
}

export function accountDeletedEmail(userName: string): { subject: string; html: string } {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
      Account Deleted
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #9ca3af; text-align: center;">
      We're sorry to see you go, ${userName || 'Adventurer'}
    </p>

    ${emailDivider()}

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
      Your Multiloop account and all associated data have been permanently deleted as requested. This action cannot be undone.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
      We hope you enjoyed using Multiloop for your tabletop adventures. If you ever decide to return, we'd be happy to have you back.
    </p>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; text-align: center;">
      Thank you for being part of our community. May your future adventures be legendary!
    </p>
  `

  return {
    subject: 'Your Multiloop account has been deleted',
    html: emailWrapper(content, 'Your Multiloop account and data have been permanently deleted')
  }
}

export { SUPPORT_EMAIL }
