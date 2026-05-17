
$root = "c:\Users\zeff_\Desktop\gh-explore-hub-main"
Set-Location $root

$pagesFiles = @(
  "src/pages/CallHistory.tsx",
  "src/pages/BoostBundles.tsx",
  "src/pages/DailyRewards.tsx",
  "src/pages/DatePlanner.tsx",
  "src/pages/DoubleDatePlanner.tsx",
  "src/pages/EditProfile.tsx",
  "src/pages/Events.tsx",
  "src/pages/EventsMap.tsx",
  "src/pages/GameLobby.tsx",
  "src/pages/GameSession.tsx",
  "src/pages/GameSessionMusic.tsx",
  "src/pages/GhostModeAlert.tsx",
  "src/pages/InviteFriends.tsx",
  "src/pages/MatchGoals.tsx",
  "src/pages/MatchInsights.tsx",
  "src/pages/MyProfile.tsx",
  "src/pages/NotificationsCenter.tsx",
  "src/pages/ProfileInsights.tsx",
  "src/pages/ProfileSetup.tsx",
  "src/pages/ProfileSoundtrack.tsx",
  "src/pages/ProfileVerification.tsx",
  "src/pages/Radar.tsx",
  "src/pages/RecentlyViewed.tsx",
  "src/pages/ResetPassword.tsx"
)

$componentFiles = @(
  "src/components/DancingChallenge.tsx",
  "src/components/IncomingCallDialog.tsx",
  "src/components/ReportUserDialog.tsx",
  "src/components/TravelMode.tsx"
)

$libFiles = @(
  "src/lib/videoProfilesAPI.ts",
  "src/lib/stripe.ts"
)

$allFiles = $pagesFiles + $componentFiles + $libFiles

foreach ($file in $allFiles) {
  $path = Join-Path $root $file
  if (-not (Test-Path $path)) { Write-Host "NOT FOUND: $file"; continue }
  $c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  if ($c -match 'import \{ logger \}') { Write-Host "SKIP (already has logger): $file"; continue }

  # Add logger import after sonner import, or after the last import line if no sonner
  if ($c -match 'import \{ toast \} from "sonner";') {
    $c = $c.Replace('import { toast } from "sonner";', "import { toast } from `"sonner`";`nimport { logger } from `"@/lib/logger`";")
  } elseif ($c -match "import \{ toast \} from 'sonner';") {
    $c = $c.Replace("import { toast } from 'sonner';", "import { toast } from 'sonner';`nimport { logger } from '@/lib/logger';")
  } else {
    # For lib files: add after the last import
    $lines = $c -split "`n"
    $lastImportIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match '^import ') { $lastImportIdx = $i }
    }
    if ($lastImportIdx -ge 0) {
      $lines[$lastImportIdx] = $lines[$lastImportIdx] + "`nimport { logger } from `"@/lib/logger`";"
      $c = $lines -join "`n"
    }
  }

  $c = $c.Replace('console.error(', 'logger.error(')
  $c = $c.Replace('console.warn(', 'logger.warn(')
  $c = $c.Replace('console.log(', 'logger.log(')

  [System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
  Write-Host "FIXED: $file"
}

Write-Host "Done."
