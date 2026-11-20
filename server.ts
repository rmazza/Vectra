import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PresetDatabase,
  VALID_MODIFIERS,
  VALID_PAYLOADS,
  VALID_TRIGGERS,
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const presetDb = new PresetDatabase();
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Ensure preset API responses are never cached by browsers across refreshes
  app.use('/api/presets', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // REST API: Persistent SQLite (better-sqlite3) Tower Presets
  app.get('/api/presets', (_req: Request, res: Response) => {
    try {
      const presets = presetDb.listPresets();
      res.json({ presets, storage: 'better-sqlite3' });
    } catch (err) {
      console.error('SQLite GET /api/presets error:', err);
      res.status(500).json({ error: 'Failed to load presets' });
    }
  });

  app.post('/api/presets', (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<{
        name: string;
        trigger: string;
        payload: string;
        modifier: string;
      }>;
      const name = String(body.name ?? '').trim().slice(0, 28);
      const trigger = String(body.trigger ?? '').toUpperCase();
      const payload = String(body.payload ?? '').toUpperCase();
      const modifier = String(body.modifier ?? '').toUpperCase();

      if (!name) {
        res.status(400).json({ error: 'Preset name is required' });
        return;
      }
      if (
        !VALID_TRIGGERS.has(trigger) ||
        !VALID_PAYLOADS.has(payload) ||
        !VALID_MODIFIERS.has(modifier)
      ) {
        res.status(400).json({ error: 'Invalid Trigger, Payload, or Modifier' });
        return;
      }

      const preset = presetDb.createPreset({ name, trigger, payload, modifier });
      res.status(201).json({ preset });
    } catch (err) {
      console.error('SQLite POST /api/presets error:', err);
      res.status(500).json({ error: 'Failed to save preset' });
    }
  });

  app.delete('/api/presets/:id', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) {
        res.status(400).json({ error: 'Preset ID is required' });
        return;
      }
      const deleted = presetDb.deletePreset(id);
      res.json({ deleted, id });
    } catch (err) {
      console.error('SQLite DELETE /api/presets/:id error:', err);
      res.status(500).json({ error: 'Failed to delete preset' });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vectra server running on http://0.0.0.0:${PORT} (better-sqlite3 active)`);
  });

  const shutdown = () => {
    presetDb.close();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start Vectra server:', err);
  process.exit(1);
});
