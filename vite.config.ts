import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // GitHub Pages serves this repo from /object-hunt-multi/, so built asset URLs
  // need that base path instead of the web root.
  base: '/object-hunt-multi/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          peer: ['simple-peer']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['three', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database', 'simple-peer']
  }
});
