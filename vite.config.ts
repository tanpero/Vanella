import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  test: {
    globals: true,
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    dedupe: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands'
    ]
  },
  optimizeDeps: {
    dedupe: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands',
      '@codemirror/stream-parser',
      '@codemirror/lang-javascript',
      '@codemirror/lang-python',
      '@codemirror/lang-cpp',
      '@codemirror/lang-java',
      '@codemirror/lang-rust',
      '@codemirror/lang-go',
      '@codemirror/lang-html',
      '@codemirror/lang-xml',
      '@codemirror/lang-css',
      '@codemirror/lang-json',
      '@codemirror/lang-sql',
      '@codemirror/lang-yaml',
      '@codemirror/lang-toml'
    ]
  },
  build: {
    sourcemap: false,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
