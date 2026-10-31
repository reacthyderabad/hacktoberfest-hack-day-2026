import { SiteNav } from '@/components/site/SiteNav'

/**
 * Thin wrapper kept so existing page imports keep working. The variant follows
 * the route: `/docs/**` gets the stable bar, everything else the floating pill.
 */
export function Navbar() {
  return <SiteNav />
}
