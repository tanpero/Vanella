import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
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
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths()
  ],
})
