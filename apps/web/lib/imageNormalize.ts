/**
 * Normalizes a picked image file into something the web — and our backend —
 * can actually read.
 *
 * The problem this exists for is HEIC. Phones shoot HEIF/HEIC by default, and
 * a file input hands that straight through: iOS Safari sometimes transcodes to
 * JPEG on its way out of the picker and sometimes doesn't (picking via Files,
 * or "Keep Originals"), and Android Chrome never does. A HEIC that reaches the
 * app renders as a blank `<img>` in every browser except Safari, and uploads as
 * a file most generation providers reject.
 *
 * Only formats the browser can't render are touched — see `WEB_SAFE_TYPES`.
 * A PNG stays a PNG and an animated GIF keeps its frames; re-encoding those
 * would cost quality (and animation) to fix a problem they don't have.
 */

/**
 * Longest edge of a converted image. A phone's 12MP HEIC decodes to ~4000px,
 * which is far past what any generation model consumes and slow to upload on
 * mobile data.
 */
export const MAX_DIMENSION = 2048

/** JPEG encode quality for converted images. */
export const JPEG_QUALITY = 0.9

/**
 * Image types every browser decodes natively. Anything outside this set gets
 * converted; anything inside is passed through byte-for-byte.
 */
const WEB_SAFE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

/**
 * Extensions we treat as images even when the browser reports no MIME type at
 * all — which is exactly what Android Chrome does for HEIC, and the reason a
 * `type.startsWith('image/')` filter silently drops phone photos.
 */
const HEIF_EXTENSIONS = new Set(['heic', 'heif', 'hif'])

/**
 * Formats safe to re-encode purely to shrink them. Neither can hold animation,
 * so a downscale can't silently drop frames — which rules out GIF, WebP and
 * AVIF, all three of which *can* be animated with no flag this code could
 * cheaply read to tell the difference.
 */
const RESIZABLE_TYPES = new Set(['image/jpeg', 'image/png'])

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/**
 * Whether a picked file should be treated as an image. Broader than
 * `file.type.startsWith('image/')` on purpose — see {@link HEIF_EXTENSIONS}.
 */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return file.type === '' && HEIF_EXTENSIONS.has(extensionOf(file.name))
}

/** `IMG_0042.HEIC` → `IMG_0042.jpg`. Keeps the name recognisable after conversion. */
export function jpegName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base || 'image'}.jpg`
}

/** Scale a size down to fit `max` on its longest edge. A no-op if it already does. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** True when this file has to be re-encoded before anything can display or upload it. */
export function needsJpegConversion(file: File): boolean {
  return !WEB_SAFE_TYPES.has(file.type)
}

/**
 * True when this file may be re-encoded just to make it smaller, with nothing
 * but resolution lost — see {@link RESIZABLE_TYPES}.
 */
export function canResize(file: File): boolean {
  return RESIZABLE_TYPES.has(file.type)
}

/**
 * Decode to an `ImageBitmap`, falling back to a wasm HEIC decoder.
 *
 * `imageOrientation: 'from-image'` is not optional here: `createImageBitmap`
 * ignores EXIF by default, and phone photos are almost always EXIF-rotated —
 * without it every portrait shot re-encodes sideways.
 *
 * The fallback is imported dynamically because it carries ~3 MB of inlined
 * libheif wasm. It must never reach the main bundle: this import is what keeps
 * the cost on the small number of users who actually pick a HEIC. The `/next`
 * entry point is the vendor's build for this framework — it decodes via
 * `OffscreenCanvas` rather than `document`.
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Not a format this browser decodes — HEIC everywhere but Safari.
  }

  try {
    const { heicTo } = await import('heic-to/next')
    // 'bitmap' skips the library's own canvas round-trip; libheif has already
    // applied the file's rotation properties by this point.
    return await heicTo({ blob: file, type: 'bitmap' })
  } catch {
    throw new Error(`Could not read "${file.name}" — try a JPEG or PNG.`)
  }
}

/** Draws `bitmap` scaled to fit {@link MAX_DIMENSION} and encodes it as `type`. */
function encode(bitmap: ImageBitmap, type: 'image/jpeg' | 'image/png'): Promise<Blob> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not convert the image — no 2D canvas context.')

  // JPEG has no alpha channel, so a transparent source would otherwise composite
  // onto the canvas's default transparent black and come out with black edges.
  // PNG keeps its alpha untouched — a logo re-encoded onto white would be worse
  // than the oversized file the re-encode exists to avoid.
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not re-encode the image.'))),
      type,
      // Ignored for PNG, which is lossless.
      type === 'image/jpeg' ? JPEG_QUALITY : undefined,
    )
  })
}

/**
 * Returns a file safe to preview and upload: the original when the browser
 * already renders its format, else a downscaled JPEG re-encode.
 *
 * Rejects with a user-presentable message when no decoder can read the file.
 */
export async function toJpegFile(file: File): Promise<File> {
  if (!needsJpegConversion(file)) return file

  const bitmap = await decode(file)
  try {
    const blob = await encode(bitmap, 'image/jpeg')
    return new File([blob], jpegName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } finally {
    bitmap.close()
  }
}

/**
 * Returns a file ready to *upload*: converted when the browser can't read its
 * format, and downscaled to {@link MAX_DIMENSION} when it's larger than that.
 *
 * The downscale is the part {@link toJpegFile} deliberately doesn't do. A
 * 12 MP phone JPEG is web-safe, so it was passed through byte-for-byte and went
 * up the wire at several MB — past a reverse proxy's body limit, and for nothing:
 * no generation model we call reads past 2048px on the longest edge.
 *
 * The two exist separately because the media library imports assets to *edit*,
 * where full resolution is the point; a reference image exists only to be sent
 * to a provider. Format is preserved for images that only need shrinking, so a
 * PNG logo keeps its transparency.
 */
export async function toUploadableImage(file: File): Promise<File> {
  const convert = needsJpegConversion(file)
  if (!convert && !canResize(file)) return file

  const bitmap = await decode(file)
  try {
    // Already inside the cap and in a format the browser reads — the original
    // bytes beat anything a re-encode could produce.
    if (!convert && Math.max(bitmap.width, bitmap.height) <= MAX_DIMENSION) return file

    const type = convert || file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const blob = await encode(bitmap, type)
    return new File([blob], type === 'image/jpeg' ? jpegName(file.name) : file.name, {
      type,
      lastModified: file.lastModified,
    })
  } finally {
    bitmap.close()
  }
}
