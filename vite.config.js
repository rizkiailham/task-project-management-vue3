import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // Performance: Enable build optimizations
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-primevue': ['primevue'],
          'vendor-ckeditor': ['ckeditor5'],
          'vendor-utils': ['axios', 'yup', 'vee-validate']
        }
      }
    },
    // Enable minification (esbuild is default and faster than terser)
    minify: 'esbuild',
    // Generate source maps for production debugging
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  // Optimize dev server
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
})
