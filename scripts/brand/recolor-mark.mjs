/**
 * Regenerate every icon asset from the brand mark.
 *
 *   node scripts/brand/recolor-mark.mjs
 *
 * Free — no model calls, no network. The source is the committed
 * `apps/web/public/elah-mark.png`: the octagonal "e" in the original crimson
 * on transparency. That file is the silhouette of record and this script never
 * writes to it, so the art stays reproducible from one place.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * The mark is the one piece of brand that cannot read a CSS token at runtime.
 * Everything else on the site resolves `--color-primary` when it paints; a PNG
 * resolves nothing, so an accent change is only finished once this has re-run.
 * Before it existed the icons had drifted into a third colour scheme: the mark
 * was crimson rgb(136,6,42) on a slate ground rgb(43,48,59), and neither value
 * appeared anywhere in the site's palette or the editor's.
 *
 * ── How the recolour works ───────────────────────────────────────────────────
 *
 * The source RGB is discarded and a flat accent is repainted through the alpha
 * channel. The output is therefore exactly `--color-primary`, not a tint or a
 * hue-rotation of the crimson, and the alpha's anti-aliased edge is preserved
 * so the octagon's diagonals stay smooth at 32px.
 *
 * ── Why these icons carry a ground when the nav logo does not ────────────────
 *
 * `components/site/Logo.tsx` paints the same mark as a CSS mask, so in the page
 * it takes its colour from the palette and sits on whatever surface is behind
 * it. An icon has no such context: it is dropped into a browser tab, a task
 * switcher or a home screen that the site does not control. Baking the site's
 * own ground in keeps the tab icon identical to the logo in the nav — an accent
 * mark on near-black — instead of a bare accent shape that lands on whatever
 * the OS happens to paint.
 *
 * `maskable-512` is the exception that proves it: a maskable icon is cropped to
 * a platform shape (circle, squircle, rounded square), so it must be opaque
 * edge to edge and must keep its art inside the safe zone — the centre 80%.
 * Its mark is inset further than the others for that reason, which is why the
 * file looks "zoomed out" beside `icon-512`.
 */

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, '../../apps/web')
const SRC = join(WEB, 'public/elah-mark.png')

/**
 * `--color-primary` (dark) from `apps/web/styles/globals.css`, which is also
 * `--elah-accent` in `packages/editor/src/styles/tokens.css`. Keep this in step
 * with both: the site and the editor share one accent, and this script is the
 * only place it is baked rather than referenced.
 */
const ACCENT = { r: 0, g: 194, b: 255 }

/**
 * `--color-surface` (dark). The page ground, so the tab icon matches the nav.
 */
const GROUND = { r: 6, g: 7, b: 10, alpha: 1 }

/**
 * Fraction of the canvas edge the mark spans.
 *
 * `STANDARD` reproduces the proportion the previous icons used, so the only
 * visible change is colour. `MASKABLE` is smaller because a maskable icon is
 * cropped: the guaranteed-visible region is the centre 80%, and the corners of
 * a square mark inside a circular crop are the first thing lost.
 */
const STANDARD = 0.64
const MASKABLE = 0.5

/** The mark alone at `size`, in the accent, on transparency. */
async function mark(size) {
  const { data, info } = await sharp(SRC)
    .trim() // drop the source's transparent margin so `size` means the glyph
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    out[i] = ACCENT.r
    out[i + 1] = ACCENT.g
    out[i + 2] = ACCENT.b
    out[i + 3] = data[i + 3] // keep the source alpha, including its anti-aliasing
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
}

/** The mark centred on the brand ground, written to `destination`. */
async function icon(size, destination, scale = STANDARD) {
  const glyph = await mark(Math.round(size * scale))
  await sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
    .composite([{ input: glyph, gravity: 'centre' }])
    .png()
    .toFile(destination)
  console.log(`✓ ${destination.slice(destination.indexOf('apps'))}`)
}

async function main() {
  mkdirSync(join(WEB, 'public/icons'), { recursive: true })

  // Next's file-based metadata routes: the tab icon and the iOS touch icon.
  await icon(256, join(WEB, 'app/icon.png'))
  await icon(180, join(WEB, 'app/apple-icon.png'))

  // Declared by app/manifest.ts.
  await icon(192, join(WEB, 'public/icons/icon-192.png'))
  await icon(512, join(WEB, 'public/icons/icon-512.png'))
  await icon(512, join(WEB, 'public/icons/maskable-512.png'), MASKABLE)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
