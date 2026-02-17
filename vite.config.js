import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        open: true,
        proxy: {
            '/api/groq': {
                target: 'https://api.groq.com/openai/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/groq/, '')
            },
            '/api/anthropic': {
                target: 'https://api.anthropic.com/v1',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/anthropic/, '')
            },
            '/api/gemini': {
                target: 'https://generativelanguage.googleapis.com/v1beta',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/gemini/, '')
            }
        }
    }
})
