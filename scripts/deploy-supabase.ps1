param(
  [string]$DatabaseUrl,
  [switch]$SkipEnv
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRef = "wrtgytkjnfvmmmkeltob"
$ProjectUrl = "https://$ProjectRef.supabase.co"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$DeploySql = Join-Path $Root "supabase\deploy.sql"
$DeploySqlToRun = $DeploySql
$EnvFile = Join-Path $Root ".env.local"
$PrismaCli = Join-Path $Root "node_modules\prisma\build\index.js"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    if ($ptr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }
}

function Find-Node {
  $candidates = @(
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"),
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  throw "Node.js was not found. Install Node.js 20+ or run this from the Codex workspace."
}

function Add-SslMode([string]$Url) {
  if ($Url -match "sslmode=") {
    return $Url
  }

  if ($Url.Contains("?")) {
    return ($Url + "&sslmode=require")
  }

  return ($Url + "?sslmode=require")
}

function Protect-EnvValue([string]$Value) {
  $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
  return ('"' + $escaped + '"')
}

function Upsert-EnvValues([string]$Path, [hashtable]$Values) {
  $lines = @()
  if (Test-Path $Path) {
    $lines = @(Get-Content -LiteralPath $Path)
  }

  foreach ($key in $Values.Keys) {
    if ([string]::IsNullOrWhiteSpace([string]$Values[$key])) {
      continue
    }

    $line = "$key=$(Protect-EnvValue ([string]$Values[$key]))"
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match "^\s*$([regex]::Escape($key))=") {
        $lines[$i] = $line
        $found = $true
      }
    }
    if (-not $found) {
      $lines += $line
    }
  }

  Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

Write-Host "Soul House Supabase one-click deploy" -ForegroundColor Magenta
Write-Host "Project ref: $ProjectRef"
Write-Host "This deploys tables, RLS policies, 15 tests, report templates, plans, and admin settings."
Write-Host ""
Write-Warn "Run this on an empty Supabase project. Re-running can fail with already-exists errors."
Write-Warn "Do not send database passwords, service role keys, or connection strings in chat."

if (-not (Test-Path $DeploySql)) {
  throw "Deploy SQL not found: $DeploySql"
}

$rawDeploySql = Get-Content -Raw -LiteralPath $DeploySql
$cleanDeploySql = [regex]::Replace($rawDeploySql, "(?m)^.*CreateSchema\s*$", "-- CreateSchema")
if ($cleanDeploySql -ne $rawDeploySql) {
  $DeploySqlToRun = Join-Path ([System.IO.Path]::GetTempPath()) "soul-house-supabase-deploy.sql"
  Set-Content -LiteralPath $DeploySqlToRun -Value $cleanDeploySql -Encoding UTF8
  Write-Ok "Cleaned SQL encoding marker."
}

if (-not (Test-Path $PrismaCli)) {
  throw "Prisma CLI not found: $PrismaCli. Run npm install in the project root first."
}

$Node = Find-Node
Write-Ok "Node.js: $(& $Node --version)"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  Write-Step "Enter Supabase database connection"
  Write-Host "Recommended path in Supabase Dashboard:"
  Write-Host "Project Settings -> Database -> Connection string -> URI"
  Write-Host ""
  Write-Host "If you only know the database password, press Enter and this script will build the direct URL."
  $DatabaseUrl = Read-Host "Paste postgresql://... URL, or press Enter to enter DB password"

  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    $password = Read-SecretText "Enter Supabase database password"
    if ([string]::IsNullOrWhiteSpace($password)) {
      throw "Database password cannot be empty."
    }
    $encodedPassword = [uri]::EscapeDataString($password)
    $DatabaseUrl = "postgresql://postgres:$encodedPassword@db.$ProjectRef.supabase.co:5432/postgres"
  }
}

if ($DatabaseUrl -match "\[YOUR-PASSWORD\]") {
  $password = Read-SecretText "The URL still contains [YOUR-PASSWORD]. Enter the database password"
  $encodedPassword = [uri]::EscapeDataString($password)
  $DatabaseUrl = $DatabaseUrl.Replace("[YOUR-PASSWORD]", $encodedPassword)
}

if ($DatabaseUrl -notmatch "^postgres(ql)?://") {
  throw "Invalid database URL. It must start with postgresql:// or postgres://."
}

$DatabaseUrl = Add-SslMode $DatabaseUrl.Trim()
$env:DATABASE_URL = $DatabaseUrl
$env:DIRECT_URL = $DatabaseUrl

Write-Step "Deploying database"
& $Node $PrismaCli db execute --url $DatabaseUrl --file $DeploySqlToRun
if ($LASTEXITCODE -ne 0) {
  throw "Database deploy failed. Check the URL, password, empty project status, and Supabase network access."
}
Write-Ok "Database SQL executed."

Write-Step "Generating Prisma Client"
& $Node $PrismaCli generate
if ($LASTEXITCODE -ne 0) {
  throw "Prisma Client generation failed."
}

Write-Step "Verifying imported data"
$verifyCode = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const [tests, plans, templates, aiConfig] = await Promise.all([
    prisma.test.count(),
    prisma.plan.count(),
    prisma.reportTemplate.count(),
    prisma.adminConfig.count({ where: { key: 'aiChatEnabled' } })
  ]);

  console.log(JSON.stringify({ tests, plans, templates, aiConfig }));
})()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.`$disconnect();
  });
"@
$verifyOutput = & $Node -e $verifyCode 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Verification failed: $verifyOutput"
}
Write-Host $verifyOutput
Write-Ok "Verification complete. The tests count should be at least 15."

if (-not $SkipEnv) {
  Write-Step "Writing local environment file"
  $writeEnv = Read-Host "Write DATABASE_URL to .env.local? Press Enter for yes, type n for no"
  if ($writeEnv.ToLowerInvariant() -ne "n") {
    $anonKey = Read-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY, press Enter to skip"
    $serviceKey = Read-Host "SUPABASE_SERVICE_ROLE_KEY, press Enter to skip"

    Upsert-EnvValues $EnvFile @{
      DATABASE_URL = $DatabaseUrl
      DIRECT_URL = $DatabaseUrl
      NEXT_PUBLIC_SUPABASE_URL = $ProjectUrl
      NEXT_PUBLIC_SUPABASE_ANON_KEY = $anonKey
      SUPABASE_SERVICE_ROLE_KEY = $serviceKey
    }
    Write-Ok ".env.local updated."
  }
  else {
    Write-Warn "Skipped .env.local update."
  }
}

Write-Step "Done"
Write-Host "Next steps:"
Write-Host "1. If you skipped anon/service role keys, copy them from Supabase API settings into .env.local later."
Write-Host "2. Run locally with: npm run dev"
Write-Host "3. For Cloudflare Pages, copy the same env vars into Cloudflare project settings."
