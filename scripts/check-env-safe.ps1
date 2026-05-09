$envPath = "backend\.env"

if (-not (Test-Path $envPath)) {
  Write-Output "env_file_exists=false"
  Write-Output "STATUS=BLOCKED"
  exit 1
}

$lines = Get-Content $envPath

$hasDatabaseUrl = [bool]($lines | Where-Object {
  $_ -match '^DATABASE_URL=' -and
  $_ -notmatch 'localhost:5432' -and
  $_ -notmatch 'YOUR-PASSWORD' -and
  $_ -notmatch 'alba:alba@localhost'
})

$usesTransactionPooler = [bool]($lines | Where-Object {
  ($_ -match '^DATABASE_URL=' -or $_ -match '^DIRECT_URL=') -and
  $_ -match 'pooler\.supabase\.com:6543'
})

$hasPrismaMode = [bool]($lines | Where-Object { $_ -match '^PERSISTENCE_MODE\s*=\s*"?prisma' })
$fallbackFalse = [bool]($lines | Where-Object { $_ -match '^ALLOW_IN_MEMORY_FALLBACK\s*=\s*"?false' })

Write-Output "env_file_exists=true"
Write-Output "database_url_configured=$hasDatabaseUrl"
Write-Output "transaction_pooler_6543=$usesTransactionPooler"
Write-Output "persistence_mode_prisma=$hasPrismaMode"
Write-Output "allow_in_memory_fallback_false=$fallbackFalse"
Write-Output "secret_value_logged=false"

if (-not $hasDatabaseUrl) {
  Write-Output "STATUS=BLOCKED - DATABASE_URL still points to localhost or placeholder"
  exit 1
}
if ($usesTransactionPooler) {
  Write-Output "STATUS=BLOCKED - Transaction Pooler :6543 detected. Use Direct/Session connection (port 5432) instead."
  exit 1
}
if (-not $hasPrismaMode -or -not $fallbackFalse) {
  Write-Output "STATUS=BLOCKED - Mode or fallback incorrect"
  exit 1
}
Write-Output "STATUS=READY - Direct/Session connection configured"
exit 0
