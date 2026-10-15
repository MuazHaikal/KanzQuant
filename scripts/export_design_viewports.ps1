param([ValidateSet('current','final')][string]$Stage='current',[string]$OutputDirectory='')
Add-Type -AssemblyName System.Drawing
$reviewDir = if($OutputDirectory){(Resolve-Path -LiteralPath $OutputDirectory).Path}else{Join-Path $PSScriptRoot "../docs/design-review/$Stage"}
Get-ChildItem -LiteralPath $reviewDir -Filter '*.raw' | ForEach-Object {
  $width = if ($_.BaseName.EndsWith('1920')) {1920} else {1440}
  $height = if ($width -eq 1920) {1080} else {900}
  $source = [System.Drawing.Bitmap]::FromFile($_.FullName)
  # The browser exporter can repeat the viewport in overscan pixels. Find the
  # repeated wordmark to recover the first complete viewport before normalizing.
  $captureWidth=$width
  $bestScore=[double]::MaxValue
  $minOffset=[int]($width*.97)
  $maxOffset=[Math]::Min([int]($width*1.15),$source.Width-100)
  foreach($offset in $(if($maxOffset -ge $minOffset){$minOffset..$maxOffset}else{@()})) {
    $score=0
    foreach($xx in 20..90) { foreach($yy in 18..28) {
      $a=$source.GetPixel($xx,$yy); $b=$source.GetPixel($xx+$offset,$yy)
      $score+=[Math]::Abs($a.R-$b.R)+[Math]::Abs($a.G-$b.G)+[Math]::Abs($a.B-$b.B)
    }}
    if($score -lt $bestScore){$bestScore=$score;$candidate=$offset}
  }
  if($bestScore -lt 50000){$captureWidth=$candidate}
  $captureHeight=[Math]::Min($source.Height,[int][Math]::Round($captureWidth*$height/$width))
  $tile=$source.Clone([System.Drawing.Rectangle]::new(0,0,$captureWidth,$captureHeight),$source.PixelFormat)
  $viewport=[System.Drawing.Bitmap]::new($tile,$width,$height)
  $viewport.Save((Join-Path $reviewDir ($_.BaseName+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $viewport.Dispose()
  $tile.Dispose()
  $source.Dispose()
}
