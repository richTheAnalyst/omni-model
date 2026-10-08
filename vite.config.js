import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vendor code is split so the app shell stays small and cacheable.
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
  if (/node_modules\/(@reduxjs|redux|redux-thunk|reselect|immer|react-redux|use-sync-external-store)\//.test(id)) {
    return 'vendor-state'
  }
  if (/node_modules\/(react-router|react-router-dom|cookie|set-cookie-parser)\//.test(id)) return 'vendor-router'
  return undefined
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: { output: { manualChunks } },
  },
})
