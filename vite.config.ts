// ABOUTME: Vite build configuration for Marginalia.
// ABOUTME: Configures React and Tailwind CSS plugins.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/marginalia/',
  plugins: [react(), tailwindcss()],
})
