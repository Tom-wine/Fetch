/**
 * Shared by the server layout (which reads the cookie) and the client shell
 * (which writes it). Deliberately NOT in a `'use client'` module: a plain export
 * from a client module becomes a client-reference proxy when a server component
 * imports it, so `cookies().get(SIDEBAR_COOKIE)` would silently look up nothing.
 */
export const SIDEBAR_COOKIE = 'fetch_sidebar'
