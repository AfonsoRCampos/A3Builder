Param(
    [string]$Out = ".\dist-prod",
    [string]$Zip = ".\a3-prod.zip",
    [int]$Port = 3000
)

Write-Host "Packaging production build..."

$root = Get-Location

if (Test-Path $Out) {
    Write-Host "Removing existing output folder $Out"
    Remove-Item -Recurse -Force $Out
}
if (Test-Path $Zip) {
    Write-Host "Removing existing zip $Zip"
    Remove-Item -Force $Zip
}

Write-Host "Installing dependencies (full)..."
npm ci
if ($LASTEXITCODE -ne 0) { Write-Error "npm ci failed"; exit 1 }

Write-Host "Building production bundle..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "npm run build failed"; exit 1 }

Write-Host "Creating output folder $Out"
New-Item -ItemType Directory -Path $Out -Force | Out-Null

function SafeCopy($src, $dest) {
    if (Test-Path $src) {
        Write-Host "Copying $src -> $dest"
        Copy-Item -Recurse -Force $src $dest
    } else {
        Write-Host "Skipping missing path: $src"
    }
}

# Copy runtime artifacts
SafeCopy ".next" $Out
SafeCopy "public" $Out

# include runtime data (A3 JSONs) so recipients can inspect / test
SafeCopy "src\data" (Join-Path $Out "src\data")

# package.json and lock
SafeCopy "package.json" $Out
SafeCopy "package-lock.json" $Out

# Install production-only dependencies directly into the output folder
Write-Host "Installing production-only dependencies into $Out\node_modules..."
npm ci --omit=dev --prefix $Out
if ($LASTEXITCODE -ne 0) { Write-Error "npm ci --omit=dev failed"; exit 1 }

# create a small run script to start the server
$runScript = @"
param(
	[int]$Port = 3000,
	[string]$Env = 'production'
)

Write-Host "Starting next ($Env) on port $Port"
node node_modules/next/dist/bin/next start -p $Port
"@

Set-Content -Path (Join-Path $Out "run.ps1") -Value $runScript -Encoding UTF8

Write-Host "Creating zip $Zip"
Compress-Archive -Path (Join-Path $Out "*") -DestinationPath $Zip -Force

Write-Host "Packaging complete. Created $Zip"
Write-Host "To run: unzip, then run './run.ps1' (PowerShell) or 'node node_modules/next/dist/bin/next start -p 3000'"
