import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function pythonEtlPlugin(): Plugin {
  return {
    name: 'python-etl-runner',
    configureServer(server) {
      server.middlewares.use('/api/run-etl', (_req, res) => {
        const pythonPath = path.resolve(__dirname, 'tools', 'python', 'python.exe');
        const scriptPath = path.resolve(__dirname, 'scripts', 'fetch_market_data.py');

        const proc = spawn(pythonPath, [scriptPath], {
          cwd: __dirname,
          windowsHide: true,
        });

        let output = '';
        proc.stdout?.on('data', (chunk) => {
          output += chunk.toString();
        });
        proc.stderr?.on('data', (chunk) => {
          output += chunk.toString();
        });

        proc.on('close', (code) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: code === 0,
              code,
              message: code === 0 ? 'Piyasa verileri başarıyla güncellendi.' : 'Veri çekme sırasında hata oluştu.',
              output: output.slice(-500),
            })
          );
        });

        proc.on('error', (err) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              message: `Python çalıştırılamadı: ${err.message}`,
            })
          );
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pythonEtlPlugin()],
  base: './',
  server: {
    open: true,
  },
});
