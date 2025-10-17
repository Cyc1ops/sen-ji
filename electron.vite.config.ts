import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    rollupOptions: {
      external: ['electron', 'better-sqlite3']
    }
  }
})

