import index from './search-index.json'

/**
 * Client-side search over the guides.
 *
 * The index is built before every dev server and every production build (see
 * `scripts/build-guides-index.mjs`), so this is a plain array in the bundle — no
 * request, no service, no Algolia account. Sixteen pages of headings is a few kilobytes;
 * a search service for that much text would be more moving parts than documentation.
 *
 * Two kinds of hit, ranked in that order:
 *
 *   1. the PAGE, when the term is in its title or summary
 *   2. a HEADING, when the term is in one — which is the one that matters in support,
 *      because it answers with a URL that lands on the paragraph rather than the page
 */
export interface GuideHit {
  id: string
  title: string
  subtitle: string
  href: string
}

export interface GuideIndexEntry {
  slug: string
  title: string
  summary: string
  section: string
  sectionLabel: string
  headings: Array<{ depth: number; text: string; id: string }>
}

export const GUIDE_INDEX = index as GuideIndexEntry[]

const LIMIT = 6

export function searchGuides(query: string, limit = LIMIT): GuideHit[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []

  const pages: GuideHit[] = []
  const headings: GuideHit[] = []

  for (const page of GUIDE_INDEX) {
    const href = `/guides/${page.slug}`

    if (page.title.toLowerCase().includes(needle) || page.summary.toLowerCase().includes(needle)) {
      pages.push({
        id: `guide_${page.slug}`,
        title: page.title,
        subtitle: `${page.section} · ${page.summary}`,
        href,
      })
    }

    for (const heading of page.headings) {
      if (!heading.text.toLowerCase().includes(needle)) continue
      headings.push({
        id: `guide_${page.slug}#${heading.id}`,
        title: heading.text,
        // The page is the subtitle here: the heading is what matched, and knowing which
        // guide it lives in is what tells the reader whether it is the right one.
        subtitle: `${page.title} · ${page.section}`,
        href: `${href}#${heading.id}`,
      })
    }
  }

  return [...pages, ...headings].slice(0, limit)
}
