# 🚀 Deployment Guide

## Pre-Deployment Checklist

### 1. Database Migrations ⚠️ CRITICAL
```bash
# Navigate to project root
cd gh-explore-hub-main

# Apply all pending migrations
supabase db push

# Regenerate TypeScript types
supabase gen types typescript --project-id fqmleivxlqqnlokconux > src/integrations/supabase/types.ts

# After types are regenerated, remove type assertions:
# - src/lib/blocking.ts (remove 'as never')
# - src/pages/Matches.tsx (remove 'as never' from fetchBlockedByYou)
```

### 2. Environment Variables
```bash
# DO NOT commit .env file
# Add to .gitignore if not already there
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Remove from git if already committed
git rm --cached .env

# Create production environment file (on your hosting platform)
# Use .env.example as template
```

### 3. Build and Test
```bash
# Install dependencies
npm install

# Run production build
npm run build

# Test the production build locally
npm run preview

# Check that:
# - All pages load correctly
# - Authentication works
# - Chat/calls function
# - No console errors
```

## Deployment Options

### Option 1: Vercel (Recommended)

#### Setup:
1. Install Vercel CLI
```bash
npm i -g vercel
```

2. Login and link project
```bash
vercel login
vercel link
```

3. Configure environment variables in Vercel Dashboard
```
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

4. Deploy
```bash
vercel --prod
```

#### Vercel Configuration (vercel.json):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Option 2: Netlify

1. Install Netlify CLI
```bash
npm i -g netlify-cli
```

2. Build and deploy
```bash
npm run build
netlify deploy --prod --dir=dist
```

3. Configure in `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Option 3: Self-Hosted (Docker)

#### Dockerfile:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/javascript application/xml+rss 
               application/json image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Build and run:
```bash
docker build -t gh-explore-hub .
docker run -p 80:80 gh-explore-hub
```

## Post-Deployment Steps

### 1. Verify Deployment
- [ ] Visit your production URL
- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test profile creation
- [ ] Test swiping and matching
- [ ] Test chat messaging
- [ ] Test voice/video calls
- [ ] Test premium features
- [ ] Test blocking functionality

### 2. Configure Supabase for Production
```sql
-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Verify policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 3. Set up Monitoring

#### A. Supabase Dashboard
- Monitor database performance
- Check API usage
- Review logs
- Set up alerts for high error rates

#### B. Add Sentry (Error Tracking)
```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

#### C. Add Analytics (Optional)
```bash
npm install @vercel/analytics
```

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

// Add to your app
<Analytics />
```

### 4. Performance Optimization

#### Enable CDN for Static Assets
- Upload images to Supabase Storage
- Use CDN URLs for profile images
- Implement lazy loading for images

#### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_location 
  ON profiles (latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_match_created 
  ON messages (match_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_likes_liked_created 
  ON likes (liked_id, created_at DESC);

-- Enable connection pooling in Supabase dashboard
-- Recommended settings:
-- Pool mode: Transaction
-- Pool size: 15
```

## Troubleshooting

### Issue: Build fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Environment variables not working
- Ensure variables start with `VITE_`
- Restart dev server after changing .env
- Check they're set in hosting platform dashboard

### Issue: WebRTC calls not connecting
- Ensure HTTPS is enabled (required for WebRTC)
- Check STUN server accessibility
- Verify firewall rules allow WebRTC traffic
- Test on different networks

### Issue: Database connection errors
- Verify Supabase URL and keys are correct
- Check Supabase project is not paused
- Verify RLS policies allow access
- Check connection pooling settings

### Issue: Slow page loads
- Enable CDN for static assets
- Optimize images (use WebP format)
- Check bundle size (should be < 500KB per chunk)
- Enable compression on hosting platform

## Security Checklist

- [ ] All RLS policies enabled and tested
- [ ] Environment variables secured (not in repo)
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting on Supabase functions
- [ ] Input validation on all forms
- [ ] Email verification enabled in Supabase Auth
- [ ] Regular backups configured in Supabase
- [ ] Database credentials rotated regularly

## Maintenance

### Regular Tasks
- **Daily**: Monitor error logs in Sentry
- **Weekly**: Check database performance metrics
- **Monthly**: Review and optimize slow queries
- **Quarterly**: Update dependencies (`npm outdated`)
- **As needed**: Apply Supabase security updates

### Scaling Considerations
- Monitor Supabase usage limits
- Consider upgrading Supabase plan if hitting limits
- Implement caching for frequently accessed data
- Consider CDN for global distribution
- Set up multiple environments (staging, production)

## Rollback Procedure

If deployment fails:

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Docker
docker run -p 80:80 gh-explore-hub:previous-tag
```

Database rollback:
```bash
# Revert last migration
supabase db reset --db-url your-project-db-url
```

## Support Contacts

- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/help
- WebRTC Issues: Check browser console and network tab
- Application Issues: Check Sentry dashboard

---

**Last Updated:** October 28, 2025  
**Version:** 1.0  
**Status:** Production Ready (after critical fixes applied)
