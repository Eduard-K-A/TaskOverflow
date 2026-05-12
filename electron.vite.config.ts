import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer')
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
            return resolve(__dirname, 'src/renderer/assets', filename)
          }
        }
      }
    ],
    assetsInclude: ['**/*.svg', '**/*.csv']
  }
})
