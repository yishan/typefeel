# Aa monospace icon and favicon

Clean vector recreation of the supplied visual direction: near-white canvas, gray `Aa`, and a slim blue glowing insertion caret. The lettering is Noto Sans Mono Regular, not an invented look-alike. The original screenshot's exact font has not been identified; Noto Sans Mono is the verified monospaced typeface selected for this recreation.

## Files

- `icons/icon.svg`: scalable master with every glyph converted to vector paths. No live text, external font dependency, or embedded raster image.
- `icons/icon-128.png`, `icon-180.png`, `icon-192.png`, `icon-256.png`, `icon-512.png`, `icon-1024.png`: square, opaque, near-white master icon exports.
- `icons/favicon.svg`: separately tuned for small browser-tab display, designed at 16 × 16 and scalable. Reduced glow, larger lettering, pixel-aligned 1px caret, and a slight optical weight increase.
- `icons/favicon-32.svg`: separate 32px optical design.
- `icons/favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-64.png`: explicit native raster sizes. The 16px artwork is not just a downscaled master.
- `icons/favicon.ico`: 16px, 32px, 48px, and 64px PNG-backed frames, preserving the separately optimized 16px artwork.
- `icons/head-snippet.html`: optional integration markup. Copy the matching assets to your site root or adjust paths. No website changes have been made.
- `previews/Aa-monospace-preview.png`: master, native-pixel favicon samples, enlarged pixel inspection, and light/dark browser-tab mockups. Native-pixel samples are only native size when this preview is viewed at 100%.
- `source/build_icons.py`: generation source. Requires Python, Pillow, fontTools, Inkscape, and the installed Noto Sans Mono Regular font path used in the source. The delivered SVGs do not require these tools or the font.
- `source/font-verification.json`: font metadata, equal-advance check, colors, and export sizes.
- `licenses/Noto-Debian-copyright.txt`: installed package copyright and license notices.

## Typeface and license

Typeface: Noto Sans Mono Regular, version 2.006.
Copyright: 2015 Google LLC (as recorded in the font metadata).
Font license: SIL Open Font License 1.1. See https://openfontlicense.org/open-font-license-official-text/ and the included package notice.

Commercial use of artwork made with the font is permitted. The OFL's requirement for fonts to remain under the OFL does not apply to documents created using the font. No font binary is bundled here. If you later distribute or modify the font software itself, retain its copyright/license notices, do not sell the font by itself, and follow any applicable reserved-name restrictions. The icon is not claimed to reproduce an identified proprietary source font.

## Colors

- Background: #FAFAFA
- Text: #737482
- Caret and glow: #4D6BFE

## Verification

Verified that Noto Sans Mono reports fixed pitch and that the uppercase A and lowercase a have identical 600-unit advances at 1000 units per em. All SVG lettering is outlined. The 16px and 32px PNGs were visually inspected at native size and under nearest-neighbor enlargement; the ICO frames were decoded and compared to their corresponding PNG files. Small browser favicons are necessarily pixel-limited, and browser scaling may vary. The 16px design keeps both letters rather than silently replacing the mark with a caret-only symbol.
