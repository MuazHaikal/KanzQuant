param([string[]]$Areas=@('global-shell','evidence-library','study-focus'))
Add-Type -AssemblyName System.Drawing
$atlasRoot=Join-Path $PSScriptRoot '../.cache/canonical-reference-atlas'
[System.IO.Directory]::CreateDirectory($atlasRoot) | Out-Null
foreach($atlasArea in $Areas){
  $atlasFiles=@(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "../docs/design-references/$atlasArea") -Filter '*.png' | Where-Object {$_.Name -notlike '00-*'} | Sort-Object Name)
  for($atlasStart=0;$atlasStart -lt $atlasFiles.Count;$atlasStart+=8){
    $atlasSlice=@($atlasFiles | Select-Object -Skip $atlasStart -First 8)
    $atlasBitmap=[System.Drawing.Bitmap]::new(1280,320*[int][Math]::Ceiling($atlasSlice.Count/2))
    $atlasGraphics=[System.Drawing.Graphics]::FromImage($atlasBitmap)
    $atlasGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0a1018'))
    $atlasGraphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $atlasFont=[System.Drawing.Font]::new('Arial',12)
    for($atlasIndex=0;$atlasIndex -lt $atlasSlice.Count;$atlasIndex++){
      $atlasImage=[System.Drawing.Image]::FromFile($atlasSlice[$atlasIndex].FullName)
      $atlasX=($atlasIndex%2)*640;$atlasY=[int][Math]::Floor($atlasIndex/2)*320
      $atlasScale=[Math]::Min(620/$atlasImage.Width,280/$atlasImage.Height)
      $atlasGraphics.DrawString($atlasSlice[$atlasIndex].Name,$atlasFont,[System.Drawing.Brushes]::White,$atlasX+8,$atlasY+4)
      $atlasGraphics.DrawImage($atlasImage,[int]($atlasX+8),[int]($atlasY+32),[int]($atlasImage.Width*$atlasScale),[int]($atlasImage.Height*$atlasScale))
      $atlasImage.Dispose()
    }
    $atlasPath=Join-Path $atlasRoot ($atlasArea+'-'+([int]($atlasStart/8)+1)+'.png')
    $atlasBitmap.Save($atlasPath,[System.Drawing.Imaging.ImageFormat]::Png)
    $atlasFont.Dispose();$atlasGraphics.Dispose();$atlasBitmap.Dispose()
    Write-Output $atlasPath
  }
}
