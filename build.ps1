Write-Host 'Installing dependencies (ci), then building production bundle'

# Use npm ci if node_modules are managed by lockfile, fallback to npm install
if (Test-Path package-lock.json) {
    Write-Host 'Detected package-lock.json — using `npm ci`'
    npm ci
} else {
    Write-Host 'No lockfile found — running `npm install`'
    npm install
}

Write-Host 'Running build (next build)'
npm run build
