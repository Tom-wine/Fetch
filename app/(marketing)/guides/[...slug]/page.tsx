import { notFound } from 'next/navigation'

import { GuidesShell } from '@/components/guides/GuidesShell'
import { PrevNext } from '@/components/guides/PrevNext'
import { GUIDE_ORDER, findGuide, neighbours, sectionOf } from '@/content/guides/nav'
import { SectionLabel } from '@/components/ui/typography'
import index from '@/lib/guides/search-index.json'

/**
 * `/guides/<section>/<page>` — one MDX file, rendered.
 *
 * The content lives in `content/guides/**.mdx`, outside `app/`, so a writer never has to
 * think about routing and a route never has to be created to add a page: add the file,
 * add the nav entry, done. This route imports it by slug.
 *
 * Every page is generated at build time from nav.ts, which also means a nav entry
 * pointing at a file that does not exist fails the build rather than shipping a link
 * that 404s — the index builder checks the same thing and exits non-zero.
 */
export function generateStaticParams() {
  return GUIDE_ORDER.map((entry) => ({ slug: entry.slug.split('/') }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const entry = findGuide(slug.join('/'))
  if (!entry) return {}

  return {
    title: `${entry.title} — Fetch.io guides`,
    description: entry.summary,
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = slug.join('/')

  const entry = findGuide(path)
  if (!entry) notFound()

  // A template literal rather than a static path: the bundler turns this into a context
  // over content/guides, so every .mdx under it is a valid target and none of them needs
  // its own route file.
  const { default: Content } = await import(`@/content/guides/${path}.mdx`)

  const page = index.find((item) => item.slug === path)
  const section = sectionOf(path)
  const { previous, next } = neighbours(path)

  return (
    <GuidesShell headings={page?.headings ?? []}>
      {section && <SectionLabel>{section.label}</SectionLabel>}

      <div className="mt-2">
        <Content />
      </div>

      <PrevNext previous={previous} next={next} />
    </GuidesShell>
  )
}
