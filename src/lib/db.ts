import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper to make Vercel KV REST API calls
async function kvCall(command: any[]) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`KV API Error: ${res.statusText}`);
    const data = await res.json();
    return data.result;
  } catch (error) {
    console.error('Vercel KV error:', error);
    return null;
  }
}

export async function getDbData(key: 'contacts' | 'logs'): Promise<any[]> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    // Production / Vercel KV connected
    const val = await kvCall(['GET', key]);
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  } else {
    // Local fallback: db.json
    try {
      await fs.access(DB_FILE);
      const content = await fs.readFile(DB_FILE, 'utf8');
      const db = JSON.parse(content);
      return db[key] || [];
    } catch {
      return [];
    }
  }
}

export async function saveDbData(key: 'contacts' | 'logs', data: any[]): Promise<boolean> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    // Production / Vercel KV connected
    const result = await kvCall(['SET', key, JSON.stringify(data)]);
    return result === 'OK';
  } else {
    // Local fallback: db.json
    try {
      let db: any = {};
      try {
        const content = await fs.readFile(DB_FILE, 'utf8');
        db = JSON.parse(content);
      } catch {}
      db[key] = data;
      await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Local JSON DB save error:', err);
      return false;
    }
  }
}
