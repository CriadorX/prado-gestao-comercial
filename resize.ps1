Add-Type -AssemblyName System.Drawing
$srcPath = "d:\prado-gestao-comercial\dist\logo-prado-premium.png"
$destPath1 = "d:\prado-gestao-comercial\dist\logo-email.png"
$destPath2 = "d:\prado-gestao-comercial\logo-email.png"

$src = [System.Drawing.Image]::FromFile($srcPath)
$dest = New-Object System.Drawing.Bitmap(300, 300)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 300, 300)
$dest.Save($destPath1, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Save($destPath2, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$dest.Dispose()
$src.Dispose()
Write-Host "Success, size: " (Get-Item $destPath1).Length
