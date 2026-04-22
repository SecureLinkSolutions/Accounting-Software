/**
 * Web IPC shim — provides window.ipc when not running inside Electron.
 * Must be imported before any code that accesses window.ipc.
 * In Electron this module is a no-op because window.ipc is already set
 * by the preload script via contextBridge.
 */
import type { ConfigMap } from 'fyo/core/types';
import type { DatabaseMethod } from 'utils/db/types';
import type { BackendResponse } from 'utils/ipc/types';
import type { ConfigFilesWithModified } from 'utils/types';

async function post(url: string, body: unknown): Promise<BackendResponse> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json() as Promise<BackendResponse>;
}

async function get(url: string): Promise<unknown> {
  const r = await fetch(url);
  return r.json();
}

const store = {
  get<K extends keyof ConfigMap>(key: K): ConfigMap[K] | undefined {
    try {
      const raw = localStorage.getItem(`fyo_${key}`);
      return raw !== null ? (JSON.parse(raw) as ConfigMap[K]) : undefined;
    } catch {
      return undefined;
    }
  },
  set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]) {
    localStorage.setItem(`fyo_${key}`, JSON.stringify(value));
  },
  delete(key: keyof ConfigMap) {
    localStorage.removeItem(`fyo_${key}`);
  },
};

const db = {
  getSchema(): Promise<BackendResponse> {
    return post('/api/db/schema', {});
  },
  create(dbPath: string, countryCode?: string): Promise<BackendResponse> {
    return post('/api/db/create', { dbPath, countryCode });
  },
  connect(dbPath: string, countryCode?: string): Promise<BackendResponse> {
    return post('/api/db/connect', { dbPath, countryCode });
  },
  call(method: DatabaseMethod, ...args: unknown[]): Promise<BackendResponse> {
    return post('/api/db/call', { method, args });
  },
  bespoke(method: string, ...args: unknown[]): Promise<BackendResponse> {
    return post('/api/db/bespoke', { method, args });
  },
};

export const webIpc = {
  desktop: false,

  reloadWindow: () => window.location.reload(),
  minimizeWindow: () => {},
  toggleMaximize: () => {},
  isMaximized: async () => false,
  isFullscreen: async () => false,
  closeWindow: () => {},

  getCreds: async () => ({ errorLogUrl: '', telemetryUrl: '', tokenString: '' }),
  getTemplates: async () => [],
  initScheduler: async (_time: string) => {},

  selectFile: async () => ({
    name: '',
    filePath: '',
    success: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: new Uint8Array() as any,
    canceled: true,
  }),
  getSaveFilePath: async () => ({ filePath: '', canceled: true }),
  getOpenFilePath: async () => ({ filePaths: [], canceled: true }),
  checkDbAccess: async () => true,
  checkForUpdates: async () => {},

  openLink: (link: string) => window.open(link, '_blank'),

  deleteFile: (filePath: string): Promise<BackendResponse> =>
    post('/api/file/delete', { filePath }),

  saveData: async (data: string, savePath: string) => {
    await post('/api/file/save', { data, savePath });
  },

  showItemInFolder: () => {},
  makePDF: async () => false,
  printDocument: async () => false,

  getDbList: (): Promise<ConfigFilesWithModified[]> =>
    get('/api/db/list') as Promise<ConfigFilesWithModified[]>,

  getDbDefaultPath: async (companyName: string): Promise<string> => {
    const r = await get(
      `/api/db/default-path?companyName=${encodeURIComponent(companyName)}`
    );
    return (r as { dbPath: string }).dbPath;
  },

  getEnv: (): Promise<{
    isDevelopment: boolean;
    platform: string;
    version: string;
  }> =>
    get('/api/env') as Promise<{
      isDevelopment: boolean;
      platform: string;
      version: string;
    }>,

  openExternalUrl: (url: string) => window.open(url, '_blank'),
  showError: async () => {},
  sendError: async () => {},
  sendAPIRequest: async () => [],

  registerMainProcessErrorListener: () => {},
  registerTriggerFrontendActionListener: () => {},
  registerConsoleLogListener: () => {},

  db,
  store,
} as const;

if (typeof window !== 'undefined' && !(window as Window & { ipc?: unknown }).ipc) {
  (window as Window & { ipc: typeof webIpc }).ipc = webIpc;
}
