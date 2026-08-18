import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The §3.3 type scale replaces Tailwind's default font sizes, so tailwind-merge
 * has to be told about it. Without this it classifies `text-btn` / `text-body` as
 * colours and a later `text-white` silently evicts the size.
 */
const FONT_SIZES = [
  'kpi',
  'display',
  'h2',
  'prose',
  'title',
  'body',
  'nav',
  'chip',
  'btn',
  'label',
  'caption',
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZES] }],
      'font-family': ['font-mono', 'font-sans', 'font-display', 'font-prose'],
      'bg-image': ['bg-fetch-gradient'],
      shadow: ['shadow-fetch-glow'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
