import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Dev rejimida /api va /uploads so'rovlari Express serverga yo'naltiriladi
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: ["es2020", "chrome80"],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@capacitor')) return 'capacitor';
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'ui';
            if (id.includes('recharts') || id.includes('d3')) return 'charts';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) return 'react';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
}));
