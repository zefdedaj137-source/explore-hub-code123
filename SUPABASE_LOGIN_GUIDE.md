# How to Login to Supabase CLI

The interactive login is having issues. Use this manual method instead:

## Method 1: Login with Access Token (Recommended)

### Step 1: Get Your Access Token

1. Go to https://app.supabase.com/account/tokens
2. Click **"Generate New Token"**
3. Give it a name like "CLI Access"
4. Copy the token (it will only show once!)

### Step 2: Login with the Token

Run this command (replace YOUR_TOKEN with the token you copied):

```bash
supabase login --token YOUR_ACCESS_TOKEN
```

Example:
```bash
supabase login --token sbp_1234567890abcdef1234567890abcdef
```

---

## Method 2: Set Environment Variable (Alternative)

You can also set the token as an environment variable:

### In PowerShell (current session):
```powershell
$env:SUPABASE_ACCESS_TOKEN = "YOUR_ACCESS_TOKEN"
```

### In PowerShell (permanent):
```powershell
[System.Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'YOUR_ACCESS_TOKEN', 'User')
```

Then you can use Supabase CLI commands without logging in each time.

---

## After Login - Link Your Project

Once logged in, link your project:

```bash
cd c:\Users\zeff_\Desktop\gh-explore-hub-main
supabase link --project-ref YOUR_PROJECT_REF
```

**Where to find your Project Ref:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Project Settings** > **General**
4. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

---

## Then Generate Types

After linking:
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

---

## Quick Alternative: Direct Type Generation (No Linking Required)

If you don't want to link, you can generate types directly with your project ID:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

**Where to find Project ID:**
Your Supabase project URL: `https://YOUR_PROJECT_ID.supabase.co`

The Project ID is the part before `.supabase.co`
