# Minimal static file server for local development (no Python/Node needed).
# Usage: powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8080]
param([int]$Port = 8080)

$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.md' = 'text/markdown; charset=utf-8'
  '.wasm' = 'application/wasm'; '.ico' = 'image/x-icon'; '.webmanifest' = 'application/manifest+json'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Circuit Defense running at http://localhost:$Port/  (Ctrl+C to stop)"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $type = $mime[$ext]; if (-not $type) { $type = 'application/octet-stream' }
        $res.ContentType = $type
        $bytes = [System.IO.File]::ReadAllBytes($full)
      } else {
        $res.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      }
      $res.Headers.Add('Cache-Control', 'no-store')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      Write-Host "Error: $_"
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
