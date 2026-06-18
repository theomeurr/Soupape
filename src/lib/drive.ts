// Client-side Google Drive backup using Google Identity Services + the Drive REST
// API. Data is stored in the hidden, app-scoped `appDataFolder` (scope
// drive.appdata) so Soupape can only see its own backup file. Requires an OAuth
// Client ID (configured in Réglages) whose authorized JS origins include the app URL.

import type { AppData } from '../types';
import { parseImported } from '../store/db';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'soupape-backup.json';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface GoogleGis {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
        error_callback?: (err: { type?: string }) => void;
      }): TokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleGis;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Chargement de Google impossible (hors-ligne ?)'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let cached: { value: string; exp: number } | null = null;

async function getToken(clientId: string): Promise<string> {
  if (cached && cached.exp > Date.now() + 5000) return cached.value;
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Autorisation refusée'));
          return;
        }
        cached = { value: resp.access_token, exp: Date.now() + (resp.expires_in ?? 3600) * 1000 };
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err.type || 'Connexion Google annulée')),
    });
    client.requestAccessToken();
  });
}

async function findFileId(token: string): Promise<string | null> {
  const url =
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)&q=' +
    encodeURIComponent(`name='${FILE_NAME}'`);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Drive (liste) : ${r.status}`);
  const json = (await r.json()) as { files?: { id: string }[] };
  return json.files?.[0]?.id ?? null;
}

export async function backupToDrive(clientId: string, data: AppData): Promise<void> {
  const token = await getToken(clientId);
  const id = await findFileId(token);
  const body = JSON.stringify(data);

  if (id) {
    const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    });
    if (!r.ok) throw new Error(`Drive (mise à jour) : ${r.status}`);
  } else {
    const boundary = `soupape${Date.now()}`;
    const metadata = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' };
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
    if (!r.ok) throw new Error(`Drive (création) : ${r.status}`);
  }
}

export async function restoreFromDrive(clientId: string): Promise<AppData | null> {
  const token = await getToken(clientId);
  const id = await findFileId(token);
  if (!id) return null;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Drive (téléchargement) : ${r.status}`);
  return parseImported(await r.text());
}
