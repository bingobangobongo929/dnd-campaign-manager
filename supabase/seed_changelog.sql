-- Suggested initial changelog entry for the multi-user launch
-- Run this after setting up your admin account, or add via Admin > Changelog UI

-- Note: Replace 'YOUR_ADMIN_USER_ID' with your actual admin user ID after signup
-- You can find it by running: SELECT id FROM auth.users WHERE email = 'admin@multiloop.app';

INSERT INTO changelog (version, title, content, is_major, published_at, created_by)
VALUES (
  '2.0.0',
  'Multi-User Launch & Security Updates',
  'We''re excited to announce a major update to Multiloop with new security features, legal compliance, and administrative capabilities!

**Security & Account Features**
• Two-factor authentication (2FA) with authenticator apps
• Backup codes for account recovery
• Enhanced password security

**Privacy & Compliance (GDPR)**
• Comprehensive Privacy Policy
• Clear Terms of Service
• Cookie consent management
• Full data export (JSON) - download all your data anytime
• Account deletion with confirmation workflow

**User Experience**
• Updated authentication flow with improved sign-up/sign-in toggle
• Cookie consent banner with Essential/All options
• Better session management

**For Transparency**
• Public changelog at /changelog
• Clear documentation of what data we collect and why

Your privacy matters to us. Multiloop uses Umami for privacy-focused analytics that doesn''t track personal information or use cookies for tracking.

Questions? Contact us at privacy@multiloop.app',
  true,
  NOW(),
  NULL  -- Replace with admin user ID or leave NULL
);

-- Example of a smaller follow-up update:
-- INSERT INTO changelog (version, title, content, is_major, published_at, created_by)
-- VALUES (
--   '2.0.1',
--   'Bug Fixes & Improvements',
--   '• Fixed issue with session loading on mobile
-- • Improved character import performance
-- • Minor UI tweaks for better accessibility',
--   false,
--   NOW() + INTERVAL '1 day',
--   NULL
-- );
