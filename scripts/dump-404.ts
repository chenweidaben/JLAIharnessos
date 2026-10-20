/**
 * v5.0试点扩展（M184角色验证 · 404清单导出）：把 e2e-smoke 判定为 404 的前端路由落盘
 *
 * 与 scripts/e2e-smoke.ts 完全相同的「前端路由提取 → API 候选 → GET 探测」启发式，
 * 唯一区别：只把 status===404 的条目写到 reports/e2e-404.txt（route<TAB>api 每行一条）。
 *
 * 运行：~\.bun\bin\bun.exe scripts/dump-404.ts
 * 前提：BFF 在 localhost:8080 运行，DEMO_MODE=1。只读探测，不写业务数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ROUTER_FILE = resolve(REPO_ROOT, 'web/src/router/index.tsx');
const OUT_FILE = resolve(REPO_ROOT, 'reports/e2e-404.txt');

const BFF_BASE = process.env.BFF_BASE ?? `http://localhost:${process.env.HTTP_PORT ?? 8080}`;
const DEMO_TOKEN = process.env.DEMO_TOKEN ?? 'bff-access-token';
const CONCURRENCY = Number(process.env.SMOKE_CONCURRENCY ?? 8);
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 8000);

function extractFrontendRoutes(source: string): string[] {
  const re = /\bpath\s*=\s*(["'])((?:(?!\1).)*)\1/g;
  const raw = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) raw.add(m[2]);
  const normalized = new Set<string>();
  for (let p of raw) {
    p = p.trim();
    if (!p) continue;
    if (!p.startsWith('/')) p = '/' + p;
    p = p.split('/').map((seg) => seg.replace(/^:[A-Za-z0-9_]+\??$/, '')).join('/');
    p = p.replace(/\/{2,}/g, '/');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    if (p === '/' || p === '' || p === '*' || p === '/*') continue;
    normalized.add(p);
  }
  return [...normalized].sort();
}

function apiCandidates(route: string): string[] {
  const primary = `/api/v1${route}`;
  const cands = [primary];
  if (route.startsWith('/admin/')) cands.push(`/api/v1${route.slice('/admin'.length)}`);
  return cands;
}

async function probeOne(route: string): Promise<{ route: string; api: string; status: number }> {
  const cands = apiCandidates(route);
  let lastStatus = 0;
  let chosenApi = cands[0];
  for (const c of cands) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(BFF_BASE + c, {
        method: 'GET', redirect: 'manual', signal: ctrl.signal,
        headers: { authorization: `Bearer ${DEMO_TOKEN}`, accept: 'application/json' },
      });
      lastStatus = res.status; chosenApi = c;
      if (res.status !== 404) break;
    } catch { lastStatus = 0; chosenApi = c; } finally { clearTimeout(timer); }
  }
  return { route, api: chosenApi, status: lastStatus };
}

async function runPool(items: string[], worker: (x: string) => Promise<any>) {
  const out: any[] = [];
  let idx = 0;
  async function loop() { while (idx < items.length) out.push(await worker(items[idx++])); }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => loop()));
  return out;
}

async function main() {
  const source = readFileSync(ROUTER_FILE, 'utf8');
  const routes = extractFrontendRoutes(source);
  console.log(`前端路由 ${routes.length} 条，开始探测...`);
  const results = await runPool(routes, probeOne);
  const notFound = results.filter((r) => r.status === 404);
  mkdirSync(resolve(REPO_ROOT, 'reports'), { recursive: true });
  const lines = [
    `# v5.0试点扩展（M184角色验证）e2e 404 清单`,
    `# 生成时间: ${new Date().toISOString()}`,
    `# BFF: ${BFF_BASE}  凭证: Bearer ${DEMO_TOKEN} (admin)`,
    `# 前端路由总数: ${routes.length}  404 条数: ${notFound.length}`,
    `# 格式: route<TAB>probedApi`,
    '',
    ...notFound.map((r) => `${r.route}\t${r.api}`),
  ];
  writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`404 条数: ${notFound.length}  已写入: ${OUT_FILE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
