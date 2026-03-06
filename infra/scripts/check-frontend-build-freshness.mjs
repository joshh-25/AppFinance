#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function latestMtimeMs(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return stat.mtimeMs;
  }
  if (!stat.isDirectory()) {
    return 0;
  }

  let latest = stat.mtimeMs;
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const childPath = path.join(targetPath, entry.name);
    const childMtime = latestMtimeMs(childPath);
    if (childMtime > latest) {
      latest = childMtime;
    }
  }

  return latest;
}

function formatTime(ms) {
  return new Date(ms).toISOString();
}

const repoRoot = process.cwd();
const frontendRoot = path.join(repoRoot, 'frontend');
const manifestPath = path.join(frontendRoot, 'dist', '.vite', 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('[build-freshness] Missing frontend build manifest:', manifestPath);
  console.error('[build-freshness] Run `npm --prefix frontend run build` before deploy.');
  process.exit(1);
}

const watchTargets = [
  path.join(frontendRoot, 'src'),
  path.join(frontendRoot, 'public'),
  path.join(frontendRoot, 'index.html'),
  path.join(frontendRoot, 'package.json'),
  path.join(frontendRoot, 'package-lock.json'),
  path.join(frontendRoot, 'vite.config.js')
];

let newestSourceMtime = 0;
for (const watchTarget of watchTargets) {
  const candidate = latestMtimeMs(watchTarget);
  if (candidate > newestSourceMtime) {
    newestSourceMtime = candidate;
  }
}

const manifestMtime = fs.statSync(manifestPath).mtimeMs;
if (newestSourceMtime > manifestMtime) {
  console.error('[build-freshness] Frontend build is stale.');
  console.error('[build-freshness] Newest source time :', formatTime(newestSourceMtime));
  console.error('[build-freshness] Build manifest time:', formatTime(manifestMtime));
  console.error('[build-freshness] Run `npm --prefix frontend run build` and redeploy.');
  process.exit(1);
}

console.log('[build-freshness] OK. Frontend build is up to date.');
