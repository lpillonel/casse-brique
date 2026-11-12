import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // relative paths so the build works under https://<user>.github.io/casse-brique/
  plugins: [react()],
})
