import cors from 'cors';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { DatabaseManager } from '../backend/database/manager';
import { BackendResponse } from '../utils/ipc/types';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID ?? '';
const PLAID_SECRET = process.env.PLAID_SECRET ?? '';
const PLAID_ENV = (process.env.PLAID_ENV ?? 'sandbox') as keyof typeof PlaidEnvironments;

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

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

app.post('/api/bank/link-token', async (_req, res) => {
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    res.status(400).json({ error: 'Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables.' });
    return;
  }
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'books-user' },
      client_name: 'Iron Ledger',
      products: [Products.Transactions],
      country_codes: [CountryCode.Au],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/bank/exchange-token', async (req, res) => {
  const { public_token, account_id } = req.body as { public_token: string; account_id: string };
  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchangeResponse.data.access_token;

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const account = accountsResponse.data.accounts.find((a) => a.account_id === account_id);

    res.json({
      access_token: accessToken,
      account: account
        ? {
            account_id: account.account_id,
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            institution: accountsResponse.data.item.institution_id ?? '',
            balance: account.balances.current ?? 0,
            currency: account.balances.iso_currency_code ?? 'AUD',
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/bank/sync', async (req, res) => {
  const { access_token, cursor } = req.body as { access_token: string; cursor?: string };
  try {
    let added: unknown[] = [];
    let modified: unknown[] = [];
    let removed: unknown[] = [];
    let nextCursor = cursor ?? '';
    let hasMore = true;

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token,
        cursor: nextCursor || undefined,
      });
      added = added.concat(response.data.added);
      modified = modified.concat(response.data.modified);
      removed = removed.concat(response.data.removed);
      nextCursor = response.data.next_cursor;
      hasMore = response.data.has_more;
    }

    res.json({ added, modified, removed, next_cursor: nextCursor });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
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
  console.log(`Iron Ledger server on port ${PORT}, data: ${DATA_DIR}`);
});
