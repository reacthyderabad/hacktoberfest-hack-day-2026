import Link from 'next/link'
import { footerColumns } from '@/config/nav'
import { Logo } from './Logo'

const isExternal = (href: string) => href.startsWith('http')
const isMail = (href: string) => href.startsWith('mailto:')

const linkClass = 'text-sm text-on-surface-variant no-underline transition-colors hover:text-on-surface'

/** The one site footer: brand block, link columns from config/nav.ts, legal line. */
export function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-low">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo size={24} wordmarkSize={16} />
            <p className="mt-3 max-w-[18rem] text-xs leading-relaxed text-on-surface-variant">
              Browser-native video infrastructure. Engine-first, renderer-agnostic, built for production creative tooling.
            </p>
            <div className="mt-4 flex gap-1">
              {['WebCodecs', 'WebGL2', 'React'].map((t) => (
                <span key={t} className="label-mono rounded border border-outline-variant px-2 py-0.5 text-2xs text-on-surface-variant">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.heading}>
              <h3 className="label-mono mb-3 text-on-surface-variant">{col.heading}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {isExternal(l.href) ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {l.label}
                      </a>
                    ) : isMail(l.href) ? (
                      <a href={l.href} className={linkClass}>
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-outline-variant pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} Elah Labs Private Limited. Open source under the Apache-2.0 license.
          </p>
          <p className="label-mono text-2xs text-on-surface-variant">Built with Next.js · Deployed on Vercel</p>
        </div>
      </div>
    </footer>
  )
}
