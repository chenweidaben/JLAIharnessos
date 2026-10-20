/**
 * 健澜科技数智医院智能体 - E2E 冒烟脚本（v5.0试点扩展 · e2e冒烟）
 *
 * 做什么：
 *  1. 从 web/src/router/index.tsx 静态提取所有前端路由 path；
 *  2. 按「前端路由 → BFF API」启发式映射出候选 API（/api/v1 + 路由名；
 *     /admin/xxx 额外尝试 /api/v1/xxx 兜底）；
 *  3. 用 DEMO admin 凭证（bff-access-token）对每个 API 发 GET，记录返回码；
 *  4. 分类统计并打印报告：
 *       200 = 通过（接口正常）
 *       401 = 通过（存在登录鉴权）
 *       403 = 通过（存在权限控制）
 *       500 = 失败（必须列出，交业务代理修复）
 *       404 = 无对应 API（前端页面路由未挂 BFF 接口，不计失败）
 *
 * 运行：
 *   DEMO_MODE=1 bun scripts/e2e-smoke.ts
 *   （Windows PowerShell:  $env:DEMO_MODE="1"; bun scripts/e2e-smoke.ts）
 *
 * 前提：BFF 已在 localhost:8080 运行（见 src/bff/server.ts，端口 HTTP_PORT 默认 8080）。
 * 本脚本不启动浏览器、不连数据库、不写业务数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* 配置                                                                */
/* ------------------------------------------------------------------ */

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ 上一级即仓库根
const REPO_ROOT = resolve(__dirname, '..');
const ROUTER_FILE = resolve(REPO_ROOT, 'web/src/router/index.tsx');

const BFF_BASE = process.env.BFF_BASE ?? `http://localhost:${process.env.HTTP_PORT ?? 8080}`;
// DEMO 态/非生产态下，attachUser 接受该 token 直接映射为 admin 用户（见 middleware/auth.ts）
const DEMO_TOKEN = process.env.DEMO_TOKEN ?? 'bff-access-token';

const CONCURRENCY = Number(process.env.SMOKE_CONCURRENCY ?? 8);
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 8000);

/* ------------------------------------------------------------------ */
/* 1. 提取前端路由                                                      */
/* ------------------------------------------------------------------ */

/**
 * 从 router/index.tsx 抽取所有 path="..." / path='...' 的字面量。
 * 不做完整的 React Router 嵌套求值（文件 48 万字符、1700+ 处 path），
 * 采用扁平归一化：相对路径补 "/"，剥掉动态段 :param 与可选 ? 。
 * 对冒烟目的而言，足够定位「路由名对应的 BFF API 是否 500」。
 */
function extractFrontendRoutes(source: string): string[] {
  // 匹配 path="..." 或 path='...'（排除 path={变量} 这种动态形式）
  const re = /\bpath\s*=\s*(["'])((?:(?!\1).)*)\1/g;
  const raw = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    raw.add(m[2]);
  }

  const normalized = new Set<string>();
  for (let p of raw) {
    p = p.trim();
    if (!p) continue;
    // 相对路由补成绝对（绝大多数子路由挂在 path="/" 下）
    if (!p.startsWith('/')) p = '/' + p;
    // 去掉动态参数段：:id / :studyUid? / :agentId
    p = p
      .split('/')
      .map((seg) => seg.replace(/^:[A-Za-z0-9_]+\??$/, ''))
      .join('/');
    // 折叠多余斜杠
    p = p.replace(/\/{2,}/g, '/');
    // 去掉结尾斜杠
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    // 跳过无意义项：根、通配 404、空
    if (p === '/' || p === '' || p === '*' || p === '/*') continue;
    normalized.add(p);
  }
  return [...normalized].sort();
}

/* ------------------------------------------------------------------ */
/* 2. 路由 → API 候选                                                   */
/* ------------------------------------------------------------------ */

/**
 * 启发式：前端路由 /admin/operation/analysis →
 *   主候选  /api/v1/admin/operation/analysis
 *   兜底    /api/v1/operation/analysis
 * 其余路由只取主候选 /api/v1 + route。
 */
function apiCandidates(route: string): string[] {
  const primary = `/api/v1${route}`;
  const cands = [primary];
  if (route.startsWith('/admin/')) {
    cands.push(`/api/v1${route.slice('/admin'.length)}`);
  }
  return cands;
}

/* ------------------------------------------------------------------ */
/* 3. 发请求并分类                                                      */
/* ------------------------------------------------------------------ */

type ProbeResult = {
  route: string;
  api: string;        // 最终命中的 API URL（404 兜底后的）
  status: number;     // HTTP 状态码；网络/超时记 0
  note?: string;      // 错误备注
};

async function probeOne(route: string): Promise<ProbeResult> {
  const cands = apiCandidates(route);
  let lastStatus = 0;
  let lastNote: string | undefined;
  let chosenApi = cands[0];

  for (const c of cands) {
    const url = BFF_BASE + c;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          authorization: `Bearer ${DEMO_TOKEN}`,
          accept: 'application/json',
        },
      });
      lastStatus = res.status;
      chosenApi = c;
      // 主候选命中（非 404）就不再试兜底
      if (res.status !== 404) break;
    } catch (err) {
      lastStatus = 0;
      lastNote = err instanceof Error ? err.message : String(err);
      chosenApi = c;
    } finally {
      clearTimeout(timer);
    }
  }

  return { route, api: chosenApi, status: lastStatus, note: lastNote };
}

/** 简单并发池 */
async function runPool(items: string[], worker: (x: string) => Promise<ProbeResult>): Promise<ProbeResult[]> {
  const out: ProbeResult[] = [];
  let idx = 0;
  async function loop() {
    while (idx < items.length) {
      const cur = items[idx++];
      out.push(await worker(cur));
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => loop());
  await Promise.all(workers);
  return out;
}

/* ------------------------------------------------------------------ */
/* 4. 主流程                                                           */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('==================================================================');
  console.log(' 健澜科技 · E2E 冒烟（v5.0试点扩展 · e2e冒烟）');
  console.log('==================================================================');
  console.log(`路由文件 : ${ROUTER_FILE}`);
  console.log(`BFF 地址 : ${BFF_BASE}`);
  console.log(`并发/超时: ${CONCURRENCY} / ${REQUEST_TIMEOUT_MS}ms`);
  console.log(`凭证     : Bearer ${DEMO_TOKEN} (DEMO admin)`);
  console.log('');

  let source: string;
  try {
    source = readFileSync(ROUTER_FILE, 'utf8');
  } catch (err) {
    console.error(`[FATAL] 无法读取路由文件: ${(err as Error).message}`);
    process.exit(2);
  }

  const routes = extractFrontendRoutes(source);
  console.log(`提取到前端路由（归一化去重后）: ${routes.length} 条`);
  console.log('');

  // 先探活 BFF
  try {
    const h = await fetch(`${BFF_BASE}/health`, { redirect: 'manual' });
    console.log(`BFF 探活 GET /health -> ${h.status}`);
    if (h.status >= 500 || h.status === 0) {
      console.error('[FATAL] BFF 不可用，终止。请先启动 BFF（start-bff.ps1）。');
      process.exit(3);
    }
  } catch (err) {
    console.error(`[FATAL] BFF 不可达: ${(err as Error).message}`);
    process.exit(3);
  }
  console.log('');

  console.log(`开始探测 ${routes.length} 个 API ...`);
  const startedAt = Date.now();
  const results = await runPool(routes, probeOne);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`探测完成，耗时 ${elapsed}s`);
  console.log('');

  /* ---- 分类统计 ---- */
  let ok200 = 0, unauth401 = 0, forbid403 = 0, server500 = 0, notFound404 = 0, other = 0, netFail = 0;
  const failures500: ProbeResult[] = [];
  const others: ProbeResult[] = [];

  for (const r of results) {
    switch (r.status) {
      case 200: ok200++; break;
      case 401: unauth401++; break;
      case 403: forbid403++; break;
      case 500: server500++; failures500.push(r); break;
      case 404: notFound404++; break;
      case 0:   netFail++; others.push(r); break;
      default:  other++; others.push(r); break;
    }
  }

  const total = results.length;
  const passed = ok200 + unauth401 + forbid403;

  /* ---- 报告 ---- */
  console.log('==================================================================');
  console.log(' 冒烟报告');
  console.log('==================================================================');
  console.log(`前端路由总数      : ${total}`);
  console.log(`  200 通过        : ${ok200}`);
  console.log(`  401 有鉴权      : ${unauth401}`);
  console.log(`  403 有权限控制  : ${forbid403}`);
  console.log(`  404 无对应 API  : ${notFound404} （页面路由未挂 BFF 接口，不计失败）`);
  console.log(`  其他状态码      : ${other}`);
  console.log(`  网络/超时失败   : ${netFail}`);
  console.log(`------------------------------------------------------------------`);
  console.log(`  通过合计(200+401+403): ${passed}`);
  console.log(`  *** 500 服务端错误  : ${server500} ***`);
  console.log('');

  if (failures500.length > 0) {
    console.log('------------------------------------------------------------------');
    console.log(' 500 失败清单（交业务代理修复，本脚本不修）');
    console.log('------------------------------------------------------------------');
    for (const r of failures500) {
      console.log(`  [500] ${r.api}`);
      console.log(`        前端路由: ${r.route}`);
      console.log(`        推断接口: GET ${BFF_BASE}${r.api}`);
    }
    console.log('');
  }

  if (others.length > 0) {
    console.log('------------------------------------------------------------------');
    console.log(' 其他/异常明细（供参考）');
    console.log('------------------------------------------------------------------');
    for (const r of others.slice(0, 50)) {
      const tag = r.status === 0 ? 'NET' : String(r.status);
      console.log(`  [${tag}] ${r.api}   <- 路由 ${r.route}${r.note ? '   (' + r.note + ')' : ''}`);
    }
    if (others.length > 50) console.log(`  ... 其余 ${others.length - 50} 条省略`);
    console.log('');
  }

  console.log('==================================================================');
  if (server500 > 0) {
    console.log(` 结论：发现 ${server500} 个 500 错误，需业务代理修复。`);
    process.exitCode = 1;
  } else {
    console.log(' 结论：未发现 500 错误，BFF 冒烟通过。');
    process.exitCode = 0;
  }
  console.log('==================================================================');
}

main();
