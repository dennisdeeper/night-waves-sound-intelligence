# Night Waves — Production Logo Patch v1.5

This is an ACTUAL INTERFACE patch for the live `index.html`, not a visual mockup.

## What changes
The old cyan/red inline SVG monogram in the production header is replaced by the existing
`night-waves-corporate-logo-warm.png` Warm Studio Light corporate mark.

## What does NOT change
- Live Input
- audio routing
- DSP
- recorder
- Scenes
- Track Intelligence
- Sound Worlds
- waveform/transport logic
- any JavaScript

## Why this package exists
The GitHub connector can read the repository but production writes are currently rejected
with HTTP 403. This package gives the smallest possible manual production patch rather than
asking you to replace the whole application.

## Apply it
1. In GitHub open `index.html`.
2. Click the pencil/Edit button.
3. Find `.nw-monogram{width:38px...` near the top.
4. Replace the three existing `.nw-monogram...` CSS rules with the CSS from `PRODUCTION-LOGO-PATCH.html`.
5. Find the `<div class="nw-monogram"...>` header block containing the old `<svg>`.
6. Replace that whole div with the replacement div from `PRODUCTION-LOGO-PATCH.html`.
7. Commit changes.
8. Do not alter any other part of `index.html`.

The logo file is already present in the repository as:
`night-waves-corporate-logo-warm.png`
