import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(root, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(root, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(root, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(root, 'src/renderer')
      }
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'figma-asset-resolver',
        resolveId(id) {
          if (id.startsWith('figma:asset/')) {
            const filename = id.replace('figma:asset/', '')
            return resolve(root, 'src/renderer/assets', filename)
          }
        }
      }
    ],
    assetsInclude: ['**/*.svg', '**/*.csv']
  }
})
