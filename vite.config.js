import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // base relativo: gli asset si risolvono sotto qualsiasi sottocartella
  // (GitHub Pages serve da /Impagina-Proxy/). App senza router → nessun lato negativo.
  base: './',
  plugins: [react()],
})
