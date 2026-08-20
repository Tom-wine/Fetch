/**
 * The guides search index, built before every dev server and every production build.
 *
 * WHY A BUILD STEP AND NOT A RUNTIME READ. The palette is a client component — it cannot
 * read the filesystem, and shipping the MDX to the browser to search it would send the
 * whole documentation set to every visitor of every screen. So the headings are
 * extracted once, into a small JSON file the client imports: about a kilobyte per guide,
 * and it is the only thing about the docs that reaches the app bundle.
 *
 * WHAT COUNTS AS FRONTMATTER HERE. Titles and summaries live in `content/guides/nav.ts`
 * rather than in per-file frontmatter. MDX v3 has no YAML frontmatter without two more
 * plugins, the nav has to be hand-ordered anyway (see the note in that file), and one
 * list that both orders and names the pages cannot drift from itself.
 *
 * `github-slugger` is what rehype-slug uses internally, so an id computed here is
 * character-for-character the id rendered onto the heading. Reimplementing the
 * algorithm would be one dash away from a table of contents whose links miss.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import GithubSluggerModule from 'github-slugger'

const GithubSlugger = GithubSluggerModule.default ?? GithubSluggerModule

const ROOT = process.cwd()
const CONTENT = path.join(ROOT, 'content', 'guides')
const OUT = path.join(ROOT, 'lib', 'guides', 'search-index.json')

/** Headings, ignoring anything inside a fenced code block. */
function headingsOf(source) {
  const slugger = new GithubSlugger()
  const headings = []
  let fenced = false

  for (const raw of source.split('\n')) {
    const line = raw.trimEnd()

    if (line.startsWith('```')) {
      fenced = !fenced
      continue
    }
    if (fenced) continue

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line)
    if (!match) continue

    // Strip the inline markup the heading text carries into the rendered anchor.
    const text = match[2]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim()

    headings.push({ depth: match[1].length, text, id: slugger.slug(text) })
  }

  return headings
}

const navUrl = pathToFileURL(path.join(CONTENT, 'nav.ts')).href
// nav.ts is TypeScript; node --experimental-strip-types runs it directly (the same way
// scripts/check-contrast.ts is run), so the index and the sidebar read one source.
const { GUIDE_NAV } = await import(navUrl)

const pages = []
let missing = 0

for (const section of GUIDE_NAV) {
  for (const entry of section.entries) {
    const file = path.join(CONTENT, `${entry.slug}.mdx`)
    let source
    try {
      source = await readFile(file, 'utf8')
    } catch {
      console.error(`  MISSING  content/guides/${entry.slug}.mdx (listed in nav.ts)`)
      missing++
      continue
    }

    pages.push({
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      section: section.title,
      sectionLabel: section.label,
      headings: headingsOf(source),
    })
  }
}

await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, `${JSON.stringify(pages, null, 2)}\n`, 'utf8')

const headingCount = pages.reduce((sum, page) => sum + page.headings.length, 0)
console.log(`guides index: ${pages.length} pages, ${headingCount} headings -> lib/guides/search-index.json`)

if (missing > 0) {
  console.error(`guides index: ${missing} page(s) listed in nav.ts have no file.`)
  process.exit(1)
}
