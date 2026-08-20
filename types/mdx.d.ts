/**
 * MDX pages are modules whose default export is a React component.
 *
 * `@next/mdx` compiles them; TypeScript still needs telling what shape comes back from
 * `import('@/content/guides/….mdx')`, or every guide route resolves to an implicit any.
 */
declare module '*.mdx' {
  import type { MDXProps } from 'mdx/types'

  export default function MDXContent(props: MDXProps): React.JSX.Element
}
