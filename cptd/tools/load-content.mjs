// Loads the study content exactly the way the app does: every content*.js file that
// index.html lists, in its order (content-merge.js last), in one shared `window`.
// Returns the merged object (window.CPTD_ALL) plus the list of files loaded.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function contentFiles() {
  const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]).filter((f) => /^content[^/]*\.js$/.test(f));
}

export function loadContent() {
  const files = contentFiles();
  if (!files.includes('content-merge.js')) throw new Error('index.html does not load content-merge.js');
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(appDir, f), 'utf8'), ctx, { filename: f });
  const C = ctx.window.CPTD_ALL;
  if (!C) throw new Error('content-merge.js did not produce window.CPTD_ALL');
  return { C, files };
}
