import cors from 'cors';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { DatabaseManager } from '../backend/database/manager';
import { BackendResponse } from '../utils/ipc/types';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const databaseManager = new DatabaseManager();
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function loadConfig(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfig(config: Record<string, unknown>): void {
  fs.ensureDirSync(DATA_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function handleResponse(
  func: () => Promise<unknown> | unknown
): Promise<BackendResponse> {
  const response: BackendResponse = {};
  try {
    response.data = await func();
  } catch (err) {
    const e = err as Error & { code?: string };
    response.error = {
      name: e.name ?? 'Error',
      message: e.message ?? String(e),
      stack: e.stack,
      code: e.code,
    };
  }
  return response;
}

app.get('/api/env', (_req, res) => {
  let version = '0.37.0';
  try {
    const pkgPath = path.join(__dirname, '../package.json');
    version = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
  } catch {}
  res.json({
    isDevelopment: process.env.NODE_ENV !== 'production',
    platform: 'linux',
    version,
  });
});

app.get('/api/db/list', async (_req, res) => {
  try {
    const config = loadConfig();
    type CFile = { id: string; companyName: string; dbPath: string; openCount: number };
    const configFiles = (config.files as CFile[]) || [];
    const seen = new Set<string>();
    const result: (CFile & { modified: string })[] = [];

    for (const file of configFiles) {
      if (seen.has(file.dbPath)) continue;
      try {
        const stat = fs.statSync(file.dbPath);
        result.push({ ...file, modified: stat.mtime.toISOString() });
        seen.add(file.dbPath);
      } catch {}
    }

    let dirFiles: string[] = [];
    try {
      dirFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.books.db'));
    } catch {}

    for (const file of dirFiles) {
      const dbPath = path.join(DATA_DIR, file);
      if (seen.has(dbPath)) continue;
      try {
        const stat = fs.statSync(dbPath);
        result.push({
          id: dbPath,
          companyName: file.replace('.books.db', ''),
          dbPath,
          openCount: 0,
          modified: stat.mtime.toISOString(),
        });
        seen.add(dbPath);
      } catch {}
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/db/default-path', (req, res) => {
  const companyName = (req.query.companyName as string) || 'company';
  fs.ensureDirSync(DATA_DIR);
  res.json({ dbPath: path.join(DATA_DIR, `${companyName}.books.db`) });
});

app.post('/api/db/schema', (_req, res) => {
  res.json({ data: databaseManager.getSchemaMap() });
});

app.post('/api/db/create', async (req, res) => {
  const { dbPath, countryCode } = req.body as { dbPath: string; countryCode?: string };
  res.json(await handleResponse(() => databaseManager.createNewDatabase(dbPath, countryCode)));
});

app.post('/api/db/connect', async (req, res) => {
  const { dbPath, countryCode } = req.body as { dbPath: string; countryCode?: string };
  res.json(await handleResponse(() => databaseManager.connectToDatabase(dbPath, countryCode)));
});

app.post('/api/db/call', async (req, res) => {
  const { method, args } = req.body as { method: string; args: unknown[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json(await handleResponse(() => databaseManager.call(method as any, ...(args || []))));
});

app.post('/api/db/bespoke', async (req, res) => {
  const { method, args } = req.body as { method: string; args: unknown[] };
  res.json(await handleResponse(() => databaseManager.callBespoke(method, ...(args || []))));
});

app.post('/api/file/save', async (req, res) => {
  const { data, savePath } = req.body as { data: string; savePath: string };
  await fs.writeFile(savePath, data, { encoding: 'utf-8' });
  res.json({ success: true });
});

app.delete('/api/file/delete', async (req, res) => {
  const { filePath } = req.body as { filePath: string };
  res.json(await handleResponse(() => fs.unlink(filePath)));
});

app.get('/api/config/:key', (req, res) => {
  const config = loadConfig();
  res.json({ value: config[req.params.key] ?? null });
});

app.post('/api/config/:key', (req, res) => {
  const config = loadConfig();
  config[req.params.key] = (req.body as { value: unknown }).value;
  saveConfig(config);
  res.json({ success: true });
});

app.delete('/api/config/:key', (req, res) => {
  const config = loadConfig();
  delete config[req.params.key];
  saveConfig(config);
  res.json({ success: true });
});

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Frappe Books server on port ${PORT}, data: ${DATA_DIR}`);
});
