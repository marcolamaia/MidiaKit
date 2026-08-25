import { defineConfig } from 'vite'
import { config as loadEnv } from 'dotenv'

// As variáveis do `.env` são carregadas no PROCESSO DO NODE, não no bundle.
// Assim a WINDSOR_API_KEY fica disponível para o middleware de API em dev e
// nunca entra no JavaScript enviado ao navegador.
loadEnv()

/**
 * Middleware que serve `/api/metrics` durante `npm run dev`, usando exatamente
 * o mesmo handler que a Vercel executa em produção. Um único caminho de código
 * entre desenvolvimento e produção — sem "funciona só no dev".
 */
function apiMiddleware() {
  return {
    name: 'media-kit-api',
    configureServer(server) {
      server.middlewares.use('/api/metrics', async (req, res) => {
        try {
          // Import dinâmico a cada requisição: editar o backend recarrega
          // sozinho, sem reiniciar o servidor.
          const { default: handler } = await server.ssrLoadModule('/api/metrics.js')
          await handler(req, res)
        } catch (error) {
          server.config.logger.error(`[api/metrics] ${error?.stack || error}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: { code: 'dev_handler_error', message: 'Falha no handler de métricas (dev).' },
          }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [apiMiddleware()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    target: 'es2020',
    // Projeto de página única e leve: um chunk evita cascata de requisições.
    rollupOptions: {
      output: { manualChunks: undefined },
    },
    reportCompressedSize: true,
  },
})
