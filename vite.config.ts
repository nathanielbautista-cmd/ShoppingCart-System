import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Laptop development starts the backend on this machine. Deployments or
  // hardware testing can still point at the Pi through VITE_DEV_API_TARGET.
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:5000';

  const tailscaleAdminGate: Plugin = {
    name: 'tailscale-only-admin-dev-route',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/admin')) return next();

        const address = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
        const octets = address.split('.').map(Number);
        const fromTailscale = octets.length === 4 && octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
        if (fromTailscale) return next();

        res.statusCode = 403;
        res.end('Admin page is only available over Tailscale.');
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), tailscaleAdminGate],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    },
  };
});
