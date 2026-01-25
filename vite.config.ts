import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    allowedHosts: true, // Allow access from Tailscale hostnames
  },
  plugins: [react()],
})
