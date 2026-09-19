// Shared plumbing for the pipeline: env, paths, JSON cache helpers, and a polite HTTP client.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
dotenv.config({ path: path.join(ROOT, '.env.local') });

// Layers: raw = exactly what the source returned; processed = our cleaned, chunked output.
export const RAW = path.join(ROOT, 'data/raw');
export const PROCESSED = path.join(ROOT, 'data/processed');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function exists(file) {
  return fs.access(file).then(() => true, () => false);
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
}

// Minimum gap between requests per host. Wikimedia asks for < 5 req/s and a real User-Agent.
const HOST_INTERVAL_MS = {
  'query.wikidata.org': 1000,
  'en.wikipedia.org': 250,
  'www.omdbapi.com': 100,
  'archive.org': 500,
};
const lastCall = new Map();

// Fetch with per-host throttling and exponential backoff on 429/5xx/network errors.
// 4xx other than 429 are returned to the caller (a 404 is data, not a failure).
export async function politeFetch(url, { retries = 4 } = {}) {
  const contact = process.env.CONTACT;
  if (!contact) throw new Error('Set CONTACT (your email or a URL) in .env.local: Wikimedia requires it in the User-Agent.');
  const host = new URL(url).host;
  const interval = HOST_INTERVAL_MS[host] ?? 250;

  for (let attempt = 0; ; attempt++) {
    const wait = (lastCall.get(host) ?? 0) + interval - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall.set(host, Date.now());

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': `PopChoice/2.0 (learning project; ${contact})`, Accept: 'application/json' },
        signal: AbortSignal.timeout(60_000),
      });
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) return res;
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000);
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(2 ** attempt * 1000);
    }
  }
}
