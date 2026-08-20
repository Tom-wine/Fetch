import path from 'node:path'
import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // An unrelated package-lock.json sits higher up the tree, so Turbopack would
  // otherwise infer the wrong workspace root. Pin it to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The floating dev badge sits bottom-left, exactly on top of the sidebar's
  // avatar/username footer. Off, so the shell can be reviewed as it will ship.
  devIndicators: false,
  // `.mdx` is a page extension so the guides compile through the same build as
  // everything else. There is no second pipeline, no docs framework and no separate
  // deploy: a guide is a React page that happens to be written in Markdown.
  pageExtensions: ['ts', 'tsx', 'mdx'],
}

/**
 * The guides toolchain, in full:
 *
 *   remark-gfm                tables, strikethrough, task lists, autolinks
 *   rehype-slug               an id on every heading
 *   rehype-autolink-headings  a `#` link to it, so any paragraph is linkable
 *
 * That last pair is what makes documentation usable in support: the answer to a question
 * becomes a URL, not "scroll down to the retries bit".
 *
 * The plugins are named as STRINGS rather than imported. Turbopack serialises loader
 * options to pass them to its Rust side, and a function cannot cross that boundary — the
 * imported form fails at startup with "loader undefined ... does not have serializable
 * options". Naming the package lets the loader require it on the other side.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-gfm', {}]],
    rehypePlugins: [
      ['rehype-slug', {}],
      [
        'rehype-autolink-headings',
        {
          behavior: 'append',
          properties: {
            className: 'heading-anchor',
            'aria-label': 'Link to this section',
          },
        },
      ],
    ],
  },
})

export default withMDX(nextConfig)
