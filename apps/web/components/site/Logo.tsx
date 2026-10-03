import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** Mark edge length in px. */
  size?: number
  className?: string
  /** Wordmark font size in px. */
  wordmarkSize?: number
}

/**
 * The elah mark plus wordmark, linking home. One logo for the header and the
 * footer.
 *
 * The mark is painted as a CSS mask over `/elah-mark.png` rather than drawn as
 * an `<img>`. The source art is the crimson octagonal "e" from the original
 * brand sheet — rgb(137, 5, 42) on transparent — and crimson on this site's
 * near-black chrome measures about 1.8:1, which is a mark you cannot see. The
 * file supplies the silhouette through its alpha channel and the colour comes
 * from the accent, so the shape is still the brand mark and it is legible on
 * every surface the chrome uses.
 *
 * The sibling marketing site solves it the same way (its `ElahMark` masks the
 * same glyph and takes `currentColor`), so the two properties now render one
 * mark rather than one crimson and one accent.
 *
 * A mask also means no second colour to maintain: retone the palette and the
 * mark follows. The PNG stays the favicon and OG identity, where it sits on a
 * light ground and reads correctly as crimson.
 */
const markStyle = (size: number) => ({
  width: size,
  height: size,
  backgroundColor: 'var(--color-primary)',
  WebkitMaskImage: 'url(/elah-mark.png)',
  maskImage: 'url(/elah-mark.png)',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
})

export function Logo({ size = 24, wordmarkSize = 16, className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="elah home"
      className={cn(
        'flex shrink-0 items-center gap-2 font-bold tracking-tight text-on-surface no-underline transition-opacity hover:opacity-80',
        className,
      )}
    >
      <span aria-hidden className="inline-block shrink-0" style={markStyle(size)} />
      <span style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: wordmarkSize, letterSpacing: '-0.02em' }}>
        elah
      </span>
    </Link>
  )
}
