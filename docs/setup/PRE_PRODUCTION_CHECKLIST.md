# ✅ Pre-Production Checklist

**Use this checklist before deploying to production**

---

## 🔴 CRITICAL (MUST FIX - 15 minutes total)

- [ ] **Apply Database Migrations** (5 min)
  ```bash
  supabase db push
  supabase gen types typescript --project-id fqmleivxlqqnlokconux > src/integrations/supabase/types.ts
  ```

- [ ] **Remove Type Assertions** (5 min)
  - [ ] Remove `as never` from `src/lib/blocking.ts`
  - [ ] Remove `as never` from `src/pages/Matches.tsx` fetchBlockedByYou
  - [ ] Test blocking functionality works

- [ ] **Secure Environment Variables** (2 min)
  ```bash
  git rm --cached .env
  git add .gitignore
  git commit -m "Secure environment variables"
  ```

- [ ] **Verify .gitignore includes**:
  - [ ] `.env`
  - [ ] `.env.local`
  - [ ] `.env.production`

- [ ] **Test Build** (3 min)
  ```bash
  npm run build
  npm run preview
  ```

---

## 🟡 HIGH PRIORITY (Fix Before Launch - 4 hours)

- [ ] **Implement Error Tracking** (1 hour)
  - [ ] Create Sentry account
  - [ ] `npm install @sentry/react`
  - [ ] Add Sentry init to `src/main.tsx`
  - [ ] Set `VITE_SENTRY_DSN` in production env
  - [ ] Test error reporting

- [ ] **Replace Console Logging** (2 hours)
  - [ ] Import logger from `src/lib/logger.ts`
  - [ ] Replace in `src/components/CallDialog.tsx` (50+ logs)
  - [ ] Replace in `src/pages/Discover.tsx` (30+ logs)
  - [ ] Replace in `src/pages/Chat.tsx` (20+ logs)
  - [ ] Replace in `src/pages/Auth.tsx` (15+ logs)
  - [ ] Keep only `logger.error()` for critical errors

- [ ] **Fix Type Safety Issues** (1 hour)
  - [ ] Replace `(supabase as any)` in `GameLobby.tsx`
  - [ ] Add proper types for game tables
  - [ ] Fix `IncomingCallDialog.old.tsx` type assertions
  - [ ] Run `npm run build` to verify no errors

---

## 🟢 IMPORTANT (Before Public Launch - 1 day)

### Testing
- [ ] **Test Critical User Flows** (2 hours)
  - [ ] Sign up → Email verification → Profile setup
  - [ ] Login → Discover → Swipe right → Match
  - [ ] Send message → Receive message (real-time)
  - [ ] Send voice message → Play voice message
  - [ ] Video call → Audio works → Video works
  - [ ] Block user → Verify can't message/call
  - [ ] Premium upgrade → Payment flow → Features unlocked

- [ ] **Test Edge Cases** (1 hour)
  - [ ] Offline behavior
  - [ ] Slow network (throttle to 3G)
  - [ ] Mobile devices (iOS Safari, Chrome)
  - [ ] Clear cache and reload
  - [ ] Multiple tabs open
  - [ ] WebRTC on different networks

### Security
- [ ] **Verify Security Measures** (1 hour)
  - [ ] All RLS policies enabled in Supabase
    ```sql
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
    ```
  - [ ] Test unauthenticated API access (should fail)
  - [ ] Verify profile data privacy (can't see others' private info)
  - [ ] Test blocking RLS policies
  - [ ] Check HTTPS enforced
  - [ ] Email verification enabled in Supabase Auth

### Performance
- [ ] **Run Performance Audit** (1 hour)
  - [ ] Lighthouse score > 90
  - [ ] First Contentful Paint < 2s
  - [ ] Time to Interactive < 3.5s
  - [ ] Bundle sizes < 600KB per chunk
  - [ ] Images optimized (use WebP when possible)
  - [ ] Lazy loading implemented

### Database
- [ ] **Optimize Database** (1 hour)
  - [ ] Add indexes for frequently queried columns
    ```sql
    CREATE INDEX idx_profiles_location ON profiles (latitude, longitude);
    CREATE INDEX idx_messages_match_created ON messages (match_id, created_at DESC);
    ```
  - [ ] Enable connection pooling (Transaction mode)
  - [ ] Set up daily backups
  - [ ] Configure database monitoring alerts

### Monitoring
- [ ] **Set Up Monitoring** (2 hours)
  - [ ] Sentry error tracking configured
  - [ ] Analytics installed (Vercel/Google Analytics)
  - [ ] Uptime monitoring (UptimeRobot/Pingdom)
  - [ ] Set up email alerts for:
    - [ ] High error rate (> 5%)
    - [ ] Downtime
    - [ ] Database connection issues
    - [ ] API rate limit warnings

---

## 🔵 RECOMMENDED (Post-Launch Improvements)

### Week 1 Post-Launch
- [ ] Add automated E2E tests (Playwright)
- [ ] Set up CI/CD pipeline
- [ ] Create staging environment
- [ ] Implement push notifications
- [ ] Add PWA manifest

### Month 1 Post-Launch
- [ ] Add rate limiting on expensive operations
- [ ] Implement advanced caching
- [ ] User feedback collection system
- [ ] A/B testing framework
- [ ] Performance monitoring dashboard

---

## 📋 Deployment Day Checklist

### Pre-Deployment (1 hour before)
- [ ] All critical fixes applied and tested
- [ ] Latest code pushed to git
- [ ] Environment variables configured in hosting platform
- [ ] Database migrations applied to production
- [ ] Backups created
- [ ] Team notified of deployment

### Deployment (30 minutes)
- [ ] Deploy to production
  ```bash
  vercel --prod
  # OR
  netlify deploy --prod
  # OR
  docker build && docker push
  ```
- [ ] Verify deployment successful
- [ ] Check all pages load
- [ ] Run smoke tests

### Post-Deployment (1 hour)
- [ ] Monitor error logs (first 30 min critical)
- [ ] Check database performance
- [ ] Verify real-time features working
- [ ] Test from multiple devices/browsers
- [ ] Monitor user sign-ups
- [ ] Check payment flow (if any users upgrading)

### If Issues Occur
- [ ] Have rollback procedure ready
  ```bash
  vercel rollback
  # OR
  netlify rollback
  ```
- [ ] Communication plan for users
- [ ] Incident response team ready

---

## 🎯 Success Criteria

**Deployment is successful if**:
- ✅ Zero critical errors in first hour
- ✅ Users can sign up and create profiles
- ✅ Matching and messaging works
- ✅ Voice/video calls connect
- ✅ No database connection issues
- ✅ Page load time < 3 seconds
- ✅ Mobile experience smooth
- ✅ Error rate < 1%

**Deployment should be rolled back if**:
- ❌ Critical errors > 5%
- ❌ Users can't log in
- ❌ Database unavailable
- ❌ Payments failing
- ❌ WebRTC calls not connecting
- ❌ Data loss or corruption

---

## 📞 Emergency Contacts

**If production issues occur**:
1. Check Sentry dashboard for errors
2. Check Supabase logs
3. Review hosting platform logs
4. Rollback if necessary
5. Notify team

**Support Resources**:
- Supabase: https://supabase.com/dashboard
- Sentry: https://sentry.io
- Hosting Platform: [Your platform dashboard]

---

**Last Updated**: October 28, 2025  
**Version**: 1.0  
**Status**: Ready to use ✅
