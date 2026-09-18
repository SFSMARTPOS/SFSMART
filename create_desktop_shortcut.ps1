$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$index = Join-Path $root 'index.html'
$icon = Join-Path $root 'app.ico'
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'SF SMART POS SYSTEM.lnk'

$chromeCandidates = @(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$browser = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) {
  $edgeCandidates = @(
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
  )
  $browser = $edgeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $browser) { throw 'Chrome or Microsoft Edge was not found.' }

$uri = ([System.Uri]$index).AbsoluteUri
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = $browser
$sc.Arguments = '--start-maximized --app="' + $uri + '"'
$sc.WorkingDirectory = $root
$sc.IconLocation = $icon + ',0'
$sc.Description = 'SF SMART POS SYSTEM'
$sc.Save()
Start-Process explorer.exe -ArgumentList ('"' + $shortcutPath + '"')
Write-Host 'Desktop shortcut created: ' $shortcutPath
