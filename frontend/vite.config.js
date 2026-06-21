import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/jobs':        'http://localhost:8000',
      '/interview':   'http://localhost:8000',
      '/outreach':    'http://localhost:8000',
      '/resume':      'http://localhost:8000',
      '/parse-resume':'http://localhost:8000',
      '/coach':       'http://localhost:8000',
      '/scout':       'http://localhost:8000',
      '/chat':        'http://localhost:8000',
      '/code':        'http://localhost:8000',
    },
  },
  build: {
    outDir: '../placementos/static_react',
    emptyOutDir: true,
  },
})
