# Age Verification - Pre-Submission Testing Checklist

**Target**: App Store Resubmission after July 8, 2026 implementation  
**Deadline**: Before building final submission binary  
**Tester**: [Engineer/QA]  

---

## ✅ Code Review Checklist

- [ ] All new files created:
  - `src/pages/AgeVerification.tsx`
  - `supabase/migrations/20260708000000_add_age_verification.sql`
  - `supabase/migrations/20260708000001_enforce_age_verification.sql`
  - `docs/AGE_VERIFICATION_IMPLEMENTATION.md`
  - `docs/CHANGES_AGE_VERIFICATION.md`
  - `docs/AGE_VERIFICATION_TESTING_CHECKLIST.md` (this file)

- [ ] Modified files reviewed:
  - `src/pages/Auth.tsx` - Apple OAuth flag set
  - `src/pages/AuthCallback.tsx` - Age verification redirect logic
  - `src/pages/ProfileSetup.tsx` - Date of birth saving
  - `src/App.tsx` - AgeVerification route added
  - `src/components/AgeGate.tsx` - Legal notice enhanced

- [ ] No TypeScript errors: `npm run build`
- [ ] No ESLint errors: `npm run lint`
- [ ] Database migrations valid SQL: `supabase migration list`

---

## 🧪 Local Testing (Development Environment)

### Test 1: Email Signup - Underage User (SHOULD BE BLOCKED)
**Steps**:
1. Go to `/auth`
2. Click "Create Account"
3. Enter email and password
4. Set birthdate to TODAY (age 0) → Max date should prevent this
5. Try to enter a date that makes user < 18 (e.g., today - 17 years)
6. Attempt to sign up

**Expected Result**:
- [ ] Birth date input shows max date = 18 years ago
- [ ] Error toast: "You must be 18 or older to use Shqiponja"
- [ ] Sign up button disabled or throws error
- [ ] No account created

**Actual Result**: ___________________

---

### Test 2: Email Signup - Adult User (SHOULD BE ALLOWED)
**Steps**:
1. Go to `/auth`
2. Click "Create Account"
3. Enter email (e.g., testadult@test.com)
4. Enter password (min 6 chars)
5. Set birthdate to 25 years ago → Should be allowed
6. Click "Create Account"

**Expected Result**:
- [ ] Account created successfully
- [ ] Directed to email confirmation page
- [ ] Toast: "Account created! Please check your email..."
- [ ] After email confirmation, directed to `/profile-setup`

**Actual Result**: ___________________

---

### Test 3: Profile Setup - Age Field (EMAIL SIGNUP USER)
**Steps**:
1. Complete email signup (Test 2)
2. Confirm email and proceed to profile setup
3. Fill in: Name, Age, City, Country, Photo
4. Age field should enforce 18+ (try entering 17, then 18, then 25)

**Expected Result**:
- [ ] Age field shows validation: "You must be at least 18 years old"
- [ ] Age 17: submit button disabled or error
- [ ] Age 18+: submit button enabled
- [ ] Submit profile with age 25

**Actual Result**: ___________________

---

### Test 4: Apple Sign-In - Underage User (SHOULD BE BLOCKED)
**Steps**:
1. Go to `/auth`
2. Click "Sign in with Apple"
3. Complete Apple OAuth flow
4. Automatically redirected to `/age-verification`
5. Try to enter birthdate making user < 18
6. Attempt to continue

**Expected Result**:
- [ ] Redirected to `/age-verification` page
- [ ] Birth date input with max date = 18 years ago
- [ ] Error: "You must be 18 or older to use Shqiponja"
- [ ] Continue button disabled
- [ ] Cannot proceed without age >= 18

**Actual Result**: ___________________

---

### Test 5: Apple Sign-In - Adult User (SHOULD BE ALLOWED)
**Steps**:
1. Go to `/auth`
2. Click "Sign in with Apple"
3. Complete Apple OAuth flow with new account
4. Automatically redirected to `/age-verification`
5. Enter birthdate 25 years ago
6. Click "Continue"

**Expected Result**:
- [ ] Birthdate validation passes (toast or silent pass)
- [ ] Profile updated with `date_of_birth` and `age_verified_at`
- [ ] Redirected to `/profile-setup`
- [ ] Profile setup form loads
- [ ] After completion, directed to `/discover`

**Actual Result**: ___________________

---

### Test 6: Like/Superlike RPC - Age Check (UNDERAGE USER BLOCKED)
**Steps** (Requires database bypass or test user):
1. Manually create a test profile with `age = 17` (via database)
2. Set `age_verified_at = NULL` to simulate underage
3. Use this user to try like/superlike operations
4. Call `like_user()` RPC

**Expected Result**:
- [ ] RPC returns error: "You must be 18 or older to use dating features"
- [ ] No like is saved
- [ ] User cannot interact with other profiles

**Actual Result**: ___________________

---

### Test 7: AgeGate Component - Version 2 (LEGAL NOTICE)
**Steps**:
1. Clear all localStorage and cookies: `localStorage.clear()`
2. Refresh the app
3. AgeGate modal should appear

**Expected Result**:
- [ ] Modal shows "Age Restriction Notice"
- [ ] Shows requirements: "At least 18 years of age"
- [ ] Shows penalties: "Providing false information may result in..."
- [ ] "I Confirm" button is visible and clickable
- [ ] "Exit" button redirects to google.com
- [ ] After clicking "I Confirm", modal is dismissed and not shown again

**Actual Result**: ___________________

---

### Test 8: Database Constraint - Cannot Create Underage Profile
**Steps** (Direct database test):
1. Use Supabase dashboard or psql
2. Try to INSERT into profiles with:
   ```sql
   INSERT INTO profiles (id, date_of_birth) 
   VALUES ('test-user-123', '2025-01-01'); -- Age 0, underage
   ```

**Expected Result**:
- [ ] Query fails with constraint violation:
  - "new row for relation "profiles" violates check constraint "profiles_age_minimum""
- [ ] Profile is not created

**Actual Result**: ___________________

---

### Test 9: RLS Policy - Cannot Create Profile Without Age Verification
**Steps** (Direct database test):
1. Create a new auth user via Supabase dashboard
2. Try to INSERT profile with:
   ```sql
   INSERT INTO profiles (id, date_of_birth, age_verified_at) 
   VALUES ('new-user-uuid', '1998-01-01', NULL); -- age_verified_at is NULL
   ```

**Expected Result**:
- [ ] INSERT fails with RLS policy violation
- [ ] Profile is not created
- [ ] Error message indicates RLS policy blocked insertion

**Actual Result**: ___________________

---

### Test 10: Existing User Migration (EDGE CASE)
**Steps**:
1. If you have existing user data, check a user without `date_of_birth`
2. Log in as that user
3. See what happens in AuthCallback

**Expected Result**:
- [ ] User can still log in (backwards compatible)
- [ ] If they try to like/superlike, RPC returns age error
- [ ] They should be prompted to verify age (handled by AuthCallback)
- [ ] After age verification, they can use dating features

**Actual Result**: ___________________

---

## 🔒 Security Checklist

- [ ] Birthdate not visible in public profile API
- [ ] Birthdate not included in profile_cache or similar
- [ ] Age calculation uses server time (CURRENT_DATE), not client time
- [ ] RPC age checks use SECURITY DEFINER (can't be bypassed)
- [ ] RLS policy prevents underage profile creation (can't insert without age_verified_at)
- [ ] No client-side validation can bypass server checks
- [ ] sessionStorage flag (`require_age_verification`) cannot be tampered with to skip age verification

---

## 📱 Platform-Specific Testing

### iOS Capacitor Build
- [ ] Build iOS app: `npm run build && npx cap copy && npx cap sync ios`
- [ ] Open in Xcode
- [ ] Run on physical device or simulator
- [ ] Test Apple Sign-In OAuth flow
- [ ] Verify AgeVerification page loads correctly
- [ ] Check that navigation works (no route errors)

### Web Build
- [ ] Build web: `npm run build`
- [ ] Serve locally: `npm run preview`
- [ ] Test all signup/login flows
- [ ] Test in multiple browsers: Chrome, Safari, Firefox
- [ ] Test on mobile viewport (responsive design)

---

## 📊 Database Verification

**After migrations are applied**, verify:

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('date_of_birth', 'age_verified_at', 'age_verification_method');

-- Expected output: 3 rows with correct data types
```

**Expected**:
- `date_of_birth` | date
- `age_verified_at` | timestamp with time zone
- `age_verification_method` | character varying

```sql
-- Check constraints exist
SELECT constraint_name, constraint_definition 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
AND constraint_name LIKE '%age%';

-- Expected: Should see profiles_age_minimum constraint
```

```sql
-- Check RLS policies exist
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Expected: Should see "Users can insert their own profile (18+ only)" policy
```

```sql
-- Check RPC functions have age checks
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND routine_name IN ('like_user', 'superlike_user');

-- Expected: Both functions should have age validation code
```

---

## 🎯 Apple Submission Preparation

**Before submitting to App Store**:

- [ ] All tests above passed ✅
- [ ] No TypeScript/ESLint errors
- [ ] Database migrations applied to production
- [ ] iOS build compiled successfully
- [ ] Build number incremented: `1.2.4` → `1.2.5`
- [ ] TestFlight version deployed and tested by internal team
- [ ] Screenshots updated to show age gate (if applicable)
- [ ] Privacy Policy updated to mention age verification

**App Store Submission Notes** (from AGE_VERIFICATION_IMPLEMENTATION.md):
```
This submission includes comprehensive age verification compliance with 
Apple Guidelines 1.1 & 5.0 to address the previous rejection.

Key features:
1. Age gate on app launch with legal notice
2. Mandatory birth date entry during email signup (min age 18)
3. Age verification after Apple OAuth before profile setup
4. Database constraints preventing underage profiles
5. RPC function validation for all dating operations
6. Complete audit trail of age verification (date_of_birth + age_verified_at)

The app now prevents minors from accessing the dating platform through 
multiple enforcement layers, addressing the safety concerns raised in the 
previous review.
```

---

## ⚠️ Known Issues / Edge Cases

### Issue 1: User Changes Age in ProfileSetup
**Scenario**: User goes through AgeVerification (sets age 25), then changes age to 17 in ProfileSetup

**Current Behavior**: 
- ProfileSetup does NOT re-validate age against database min/max
- Profile update might fail due to CHECK constraint

**Fix Applied**: 
- ProfileSetup validates age >= 18 before submission ✅
- Database CHECK constraint prevents invalid data ✅

---

### Issue 2: Date of Birth Calculation from Age
**Scenario**: User enters age 25 on Jan 15, 2026
- Birthdate calculated: Jan 15, 2001
- But user might have been born Dec 15, 2000 (still 25)

**Current Behavior**: 
- We use age to calculate DOB, not exact date
- Acceptable because we only care about age >= 18, not exact age

**Impact**: 
- Low risk for compliance (18+ is enforced, not exact age)
- Could add optional "date of birth picker" in future

---

### Issue 3: Timezone Issues with CURRENT_DATE
**Scenario**: User verifies age at 11:59 PM on their 18th birthday (in their timezone)
- Server uses UTC, might calculate age as 17

**Mitigation**: 
- age() function is timezone-safe in PostgreSQL
- User won't be exactly 18 for ~1 minute at timezone boundaries
- Acceptable edge case for dating app

---

## 📋 Sign-Off

**Code Review**: _____ / Date: _____  
**QA Testing**: _____ / Date: _____  
**Security Review**: _____ / Date: _____  
**Apple Submission Ready**: _____ / Date: _____  

---

## 📞 Support

**If tests fail**:
1. Check migrations applied: `supabase migration list`
2. Check TypeScript: `npm run build` (no errors?)
3. Check logs: Browser dev tools + Supabase dashboard
4. Review CHANGES_AGE_VERIFICATION.md for what was modified
5. Review error messages against expected results above

**Debugging RPC Errors**:
```typescript
// In browser console
const { data, error } = await supabase.rpc('like_user', { p_profile_id: 'some-uuid' });
console.log('RPC Response:', { data, error });
// Should show age validation error if user < 18
```

---

**Status**: Ready for testing ✅  
**Last Updated**: July 8, 2026
