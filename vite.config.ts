/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Vendors in their own long-cached chunks: app code changes more often
        // than libraries, so a deploy does not re-download them.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|@tanstack|zustand)[\\/]/ },
            { name: 'vendor-editor', test: /node_modules[\\/](@tiptap|prosemirror-[^\\/]+|linkifyjs|orderedmap|rope-sequence|w3c-keyname)[\\/]/ },
            { name: 'vendor-highlight', test: /node_modules[\\/](lowlight|highlight\.js)[\\/]/ },
            { name: 'vendor-rough', test: /node_modules[\\/]roughjs[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
