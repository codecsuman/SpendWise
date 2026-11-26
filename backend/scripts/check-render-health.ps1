param(
    [Parameter(Mandatory = $true)]
    [string]$ServiceUrl
)

$healthUrl = $ServiceUrl.TrimEnd('/') + '/health'
$health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 60 -ErrorAction Stop

if ($health.status -cne 'ok') {
    throw "Expected status 'ok' from $healthUrl."
}

$health | ConvertTo-Json -Compress
