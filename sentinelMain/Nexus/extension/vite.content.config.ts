import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/scanner.ts'),
      name: 'NexusScanner',
      formats: ['iife'],
      fileName: () => 'content/scanner.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
