import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      include: '**/*.{jsx,js,tsx,ts}',
      babel: {
        parserOpts: {
          plugins: ['jsx']
        }
      }
    })
  ],
  server: {
    port: 3000,
    open: true,
    // Allow access from other machines on the same LAN
    // - `host: true` makes Vite listen on 0.0.0.0
    // - Configure HMR to use the host address when clients connect from LAN
    host: true,
    hmr: {
      // let Vite auto-detect; when using some networks you might set this to your machine IP
      protocol: 'ws'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
