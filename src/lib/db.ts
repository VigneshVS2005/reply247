import fs from 'fs/promises';
import path from 'path';
import { createClient } from 'redis';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Global Redis client cache to prevent connection leakage in serverless environments
const globalForRedis = globalThis as unknown as { redisClient: any };

async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!globalForRedis.redisClient) {
    try {
      const client = createClient({ url: redisUrl });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      globalForRedis.redisClient = client;
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      return null;
    }
  }
  return globalForRedis.redisClient;
}

// Helper to make Vercel KV REST API calls (fallback)
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

export async function getDbData(key: 'contacts' | 'logs' | 'board'): Promise<any> {
  const redisUrl = process.env.REDIS_URL;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (redisUrl) {
    try {
      const client = await getRedisClient();
      if (client) {
        const val = await client.get(key);
        if (val) {
          return JSON.parse(val);
        }
      }
    } catch (error) {
      console.error('Redis DB read error:', error);
    }
  }

  if (url && token) {
    // Production / Vercel KV connected
    const val = await kvCall(['GET', key]);
    if (!val) return key === 'board' ? null : [];
    try {
      return JSON.parse(val);
    } catch {
      return key === 'board' ? null : [];
    }
  } else {
    // Local fallback: db.json
    try {
      await fs.access(DB_FILE);
      const content = await fs.readFile(DB_FILE, 'utf8');
      const db = JSON.parse(content);
      return db[key] !== undefined ? db[key] : (key === 'board' ? null : []);
    } catch {
      return key === 'board' ? null : [];
    }
  }
}

export async function saveDbData(key: 'contacts' | 'logs' | 'board', data: any): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (redisUrl) {
    try {
      const client = await getRedisClient();
      if (client) {
        await client.set(key, JSON.stringify(data));
        return true;
      }
    } catch (error) {
      console.error('Redis DB write error:', error);
    }
  }

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
