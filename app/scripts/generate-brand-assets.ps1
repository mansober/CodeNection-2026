# Optional authoring tool: npm install --no-save --package-lock=false sharp
# The shipped PNGs are already generated. This does not affect app runtime.
node (Join-Path $PSScriptRoot 'generate-brand-assets.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Santai icon generation failed. Install the optional sharp package first.' }
