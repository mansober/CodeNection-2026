Add-Type -AssemblyName System.Drawing

function New-Canvas([int]$size, [bool]$transparent = $false) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  if ($transparent) {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  } else {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#173E32'))
  }
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-RoundedLine($graphics, $pen, [float]$x1, [float]$y1, [float]$x2, [float]$y2) {
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($pen, $x1, $y1, $x2, $y2)
}

function Draw-MarginMark($graphics, [int]$size, [string]$lineColor, [bool]$withAccent = $true) {
  $scale = $size / 1024
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($lineColor), (66 * $scale))
  Draw-RoundedLine $graphics $pen (282 * $scale) (224 * $scale) (282 * $scale) (800 * $scale)
  Draw-RoundedLine $graphics $pen (390 * $scale) (300 * $scale) (684 * $scale) (300 * $scale)
  Draw-RoundedLine $graphics $pen (390 * $scale) (512 * $scale) (748 * $scale) (512 * $scale)
  Draw-RoundedLine $graphics $pen (390 * $scale) (724 * $scale) (620 * $scale) (724 * $scale)
  $pen.Dispose()

  if ($withAccent) {
    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#F0B34E'))
    $graphics.FillEllipse($accent, (756 * $scale), (267 * $scale), (66 * $scale), (66 * $scale))
    $accent.Dispose()
  }
}

function Save-Png($canvas, [string]$path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

$images = Join-Path $PSScriptRoot '..\assets\images'

$icon = New-Canvas 1024
Draw-MarginMark $icon.Graphics 1024 '#F8F7F2'
Save-Png $icon (Join-Path $images 'icon.png')

$foreground = New-Canvas 1024 $true
$tileBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#173E32'))
$foreground.Graphics.FillEllipse($tileBrush, 160, 160, 704, 704)
$tileBrush.Dispose()
Draw-MarginMark $foreground.Graphics 1024 '#F8F7F2'
Save-Png $foreground (Join-Path $images 'android-icon-foreground.png')

$background = New-Canvas 1024 $true
$background.Graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#F8F7F2'))
Save-Png $background (Join-Path $images 'android-icon-background.png')

$mono = New-Canvas 1024 $true
Draw-MarginMark $mono.Graphics 1024 '#000000' $false
Save-Png $mono (Join-Path $images 'android-icon-monochrome.png')

$splash = New-Canvas 512 $true
Draw-MarginMark $splash.Graphics 512 '#173E32'
Save-Png $splash (Join-Path $images 'splash-icon.png')

$favicon = New-Canvas 64
Draw-MarginMark $favicon.Graphics 64 '#F8F7F2'
Save-Png $favicon (Join-Path $images 'favicon.png')
