import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Phaser's ESM bundle has no default export. The UMD build does, and matches `export = Phaser`.
const phaserBundle = fileURLToPath(new URL('./node_modules/phaser/dist/phaser.js', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  devtools: {
    // Remove this `apply` property to enable devtools for build as well
    apply: 'serve',
  },
  plugins: [react()],
  resolve: {
    alias: {
      phaser: phaserBundle,
    },
  },
})
