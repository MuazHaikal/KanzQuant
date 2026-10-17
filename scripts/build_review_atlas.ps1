param([Parameter(Mandatory=$true)][string]$Directory)
Add-Type -AssemblyName System.Drawing
$reviewFiles=@(Get-ChildItem -LiteralPath $Directory -Filter '*.png' | Where-Object {$_.Name -notlike 'atlas-*'} | Sort-Object Name)
for($reviewStart=0;$reviewStart -lt $reviewFiles.Count;$reviewStart+=6){
 $reviewSlice=@($reviewFiles | Select-Object -Skip $reviewStart -First 6)
 $reviewBitmap=[System.Drawing.Bitmap]::new(1920,390*[int][Math]::Ceiling($reviewSlice.Count/2))
 $reviewGraphics=[System.Drawing.Graphics]::FromImage($reviewBitmap)
 $reviewGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#080e15'))
 $reviewFont=[System.Drawing.Font]::new('Arial',13)
 for($reviewIndex=0;$reviewIndex -lt $reviewSlice.Count;$reviewIndex++){
  $reviewImage=[System.Drawing.Image]::FromFile($reviewSlice[$reviewIndex].FullName)
  $reviewX=($reviewIndex%2)*960;$reviewY=[int][Math]::Floor($reviewIndex/2)*390
  $reviewGraphics.DrawString($reviewSlice[$reviewIndex].Name,$reviewFont,[System.Drawing.Brushes]::White,$reviewX+8,$reviewY)
  $reviewGraphics.DrawImage($reviewImage,$reviewX,$reviewY+25,960,360)
  $reviewImage.Dispose()
 }
 $reviewBitmap.Save((Join-Path $Directory ('atlas-'+([int]($reviewStart/6)+1)+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $reviewFont.Dispose();$reviewGraphics.Dispose();$reviewBitmap.Dispose()
}
