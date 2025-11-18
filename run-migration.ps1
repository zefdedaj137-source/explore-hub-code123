# PowerShell script to run the Supabase migration
# Run this script or follow the manual steps below

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Supabase Migration Helper Script" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Since psql is not installed, please follow these manual steps:" -ForegroundColor Yellow
Write-Host ""

Write-Host "STEP 1: Run Database Migration" -ForegroundColor Green
Write-Host "-------------------------------" -ForegroundColor Green
Write-Host "1. Open your browser and go to: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Click 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "4. Click '+ New Query'" -ForegroundColor White
Write-Host "5. Open this file in VS Code:" -ForegroundColor White
Write-Host "   supabase\migrations\20251024_add_spotlight_booster.sql" -ForegroundColor Cyan
Write-Host "6. Copy ALL the content (Ctrl+A, Ctrl+C)" -ForegroundColor White
Write-Host "7. Paste it into the Supabase SQL Editor" -ForegroundColor White
Write-Host "8. Click 'Run' or press Ctrl+Enter" -ForegroundColor White
Write-Host "9. Wait for 'Success' message" -ForegroundColor White
Write-Host ""

Write-Host "STEP 2: Create Storage Bucket" -ForegroundColor Green
Write-Host "------------------------------" -ForegroundColor Green
Write-Host "1. In Supabase Dashboard, click 'Storage' in the left sidebar" -ForegroundColor White
Write-Host "2. Click 'Create a new bucket'" -ForegroundColor White
Write-Host "3. Bucket name: avatars" -ForegroundColor Cyan
Write-Host "4. Check 'Public bucket'" -ForegroundColor White
Write-Host "5. Click 'Create bucket'" -ForegroundColor White
Write-Host ""

Write-Host "STEP 3: Add Storage Policies" -ForegroundColor Green
Write-Host "-----------------------------" -ForegroundColor Green
Write-Host "1. Click on the 'avatars' bucket" -ForegroundColor White
Write-Host "2. Click 'Policies' tab" -ForegroundColor White
Write-Host "3. Click 'New Policy' -> 'For full customization'" -ForegroundColor White
Write-Host "4. Add these 3 policies (copy from SETUP_GUIDE.md):" -ForegroundColor White
Write-Host "   - Public read access" -ForegroundColor Cyan
Write-Host "   - Users can upload their own avatars" -ForegroundColor Cyan
Write-Host "   - Users can update their own avatars" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 4: Grant Boost Credits (for testing)" -ForegroundColor Green
Write-Host "------------------------------------------" -ForegroundColor Green
Write-Host "1. Go back to SQL Editor" -ForegroundColor White
Write-Host "2. Run this command:" -ForegroundColor White
Write-Host ""
Write-Host "UPDATE profiles SET boost_credits = 5 WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Click 'Run'" -ForegroundColor White
Write-Host ""

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "After completing all steps, refresh your app!" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to open the SQL file in VS Code..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open the SQL file in VS Code
code "c:\Users\zeff_\Desktop\gh-explore-hub-main\supabase\migrations\20251024_add_spotlight_booster.sql"
