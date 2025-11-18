# DISABLE EMAIL CONFIRMATION FOR DEVELOPMENT

## Quick Fix: Disable Email Confirmation

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/projects/fqmleivxlqqnlokconux

2. **Navigate to**: Authentication → Settings → Auth

3. **Find**: "Enable email confirmations" 

4. **Turn OFF**: Email confirmations (toggle to disabled)

5. **Save Changes**

## Alternative: Enable Email Provider

If you want to keep email confirmations enabled, you need to configure an email provider:

1. **Go to**: Authentication → Settings → SMTP Settings
2. **Configure an email provider** (like SendGrid, AWS SES, etc.)
3. **Or use the built-in Supabase email** (has daily limits)

## For Development (Recommended)

**Turn OFF email confirmations** so users can sign up and immediately use the app without needing to confirm their email.

After disabling email confirmations:
- Users will be immediately authenticated after sign-up
- No email confirmation required
- Photo uploads should work immediately