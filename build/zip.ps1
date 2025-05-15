# Powershell script that mimics "zip -r".

# This is slightly tricky, since Powershell's builtin `Compress-Archive` cmdlet doesn't preserve
# directory structure properly. Most of this script was adapted from
# https://stackoverflow.com/a/59018865.

$ZipName = $args[0]
$TargetFiles = @()

foreach ($filename in $args[1..$args.length]) {
  if ((Get-Item $filename).PSIsContainer) {
    $TargetFiles += @((Get-ChildItem -Recurse $filename -File).FullName)
  }
  else {
    $TargetFiles += (Get-Item $filename).FullName
  }
}

$TargetFiles = $TargetFiles | Sort-Object | Get-Unique

if (Test-Path $ZipName) {
  Remove-Item $ZipName
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open(($ZipName), [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($filename in $TargetFiles) {
  if (Test-Path $filename -PathType Container) {
    continue
  }
  $relPath = $(Resolve-Path -Path $filename -Relative).Substring(2)
  $entry = $zip.CreateEntry($relPath)
  $writer = New-Object -TypeName System.IO.BinaryWriter $entry.Open()
  $writer.Write([System.IO.File]::ReadAllBytes($relPath))
  $writer.Flush()
  $writer.Close()
}
$zip.Dispose();


