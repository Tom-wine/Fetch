import path from 'node:path'
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
}

export default nextConfig
