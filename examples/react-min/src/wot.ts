// Node‑WoT bootstrap for the React demo
// This module ensures the browser bundle is loaded and exposes helpers to access WoT per API.

// Import the prebuilt browser bundle which must define `window.WoT`
import '/vendor/wot-bundle.min.js';

export function getWoT(): any {
  const g: any = globalThis as any;
  if (!g?.WoT || typeof g.WoT.consume !== 'function') {
    throw new Error('Node‑WoT not available. Ensure /vendor/wot-bundle.min.js provides window.WoT with a consume() method.');
  }
  return g.WoT;
}

export async function fetchTd(tdUrl: string): Promise<any> {
  const res = await fetch(tdUrl);
  if (!res.ok) throw new Error(`Failed to fetch TD: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function consumeTdUrl(tdUrl: string): Promise<any> {
  const td = await fetchTd(tdUrl);
  const WoT = getWoT();
  return WoT.consume(td);
}
