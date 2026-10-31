import type { ReactNode } from 'react'

export interface PageHeaderProps {
  /** Small mono label above the title (section or category). */
  eyebrow: ReactNode
  /** The page's single h1. */
  title: ReactNode
  /** One or two sentences under the title. */
  lede?: ReactNode
  /** Extra content under the lede (a callout, a CTA row). */
  children?: ReactNode
  /**
   * `page` is the full-width header for marketing pages and uses the same type
   * scale and measure as the landing's section heads. `doc` is the same
   * pattern inside a docs article column: smaller title, hairline underneath.
   */
  variant?: 'page' | 'doc'
  /** `narrow` aligns the header with a max-w-3xl body (changelog). Page variant only. */
  width?: 'wide' | 'narrow'
  /** Anchor id for the h1 (docs pages link to it from the sidebar). */
  id?: string
}

/**
 * The one page-header block: eyebrow, h1, lede. The h1 face comes from the
 * global heading rule (`--font-display`), not from this component.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
  variant = 'page',
  width = 'wide',
  id,
}: PageHeaderProps) {
  const isDoc = variant === 'doc'

  const content = (
    <>
      <div className="label-mono text-2xs text-primary" style={{ letterSpacing: '0.16em' }}>
        {eyebrow}
      </div>
      <h1
        id={id}
        className={
          isDoc
            ? 'mb-3 mt-3 scroll-mt-24 text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] text-on-surface'
            : 'mb-3.5 mt-3.5 text-[clamp(32px,5.4vw,56px)] font-semibold leading-[1.08] tracking-[-0.025em] text-on-surface [text-wrap:balance]'
        }
      >
        {title}
      </h1>
      {lede ? (
        <p
          className={`m-0 max-w-[40rem] text-base leading-relaxed text-on-surface-variant [text-wrap:pretty]`}
        >
          {lede}
        </p>
      ) : null}
      {children}
    </>
  )

  if (isDoc) {
    return <header className="mb-8 border-b border-outline-variant pb-6">{content}</header>
  }

  return (
    <header className="pt-[clamp(32px,5vw,64px)]">
      <div
        className={`mx-auto px-4 sm:px-6 ${width === 'narrow' ? 'max-w-3xl' : 'max-w-7xl'}`}
      >
        {content}
      </div>
    </header>
  )
}
