// BFF 静态审计脚本：路由注册/遮蔽/重复、信封风格、错误码-HTTP 状态一致性
// 只读仓库源码，不写回仓库。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/lenovo/Doubao/chats/2026-09-14/new-chat-1';
const SERVER = path.join(ROOT, 'src/bff/server.ts');
const serverSrc = fs.readFileSync(SERVER, 'utf8');
const serverLines = serverSrc.split('\n');

// ---------- 1. 解析 import { X [as Y] } from './routes/...' ----------
const importMap = new Map(); // localName -> { exportName, rel, file }
const importRe = /import\s*\{([^}]+)\}\s*from\s*'(\.\/routes\/[^']+)'/g;
let im;
while ((im = importRe.exec(serverSrc)) !== null) {
  const names = im[1].split(',').map((s) => s.trim()).filter(Boolean);
  for (const n of names) {
    const m = n.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
    if (!m) continue;
    const exportName = m[1];
    const local = m[2] ?? m[1];
    const rel = im[2].replace(/^\.\//, '');
    let file = path.join(ROOT, 'src/bff', rel + '.ts');
    if (!fs.existsSync(file)) file = path.join(ROOT, 'src/bff', rel + '/index.ts');
    importMap.set(local, { exportName, rel, file });
  }
}

// ---------- 2. 解析 allRoutes 数组块 ----------
const startIdx = serverSrc.indexOf('const allRoutes: RouteDef[] = [');
if (startIdx < 0) throw new Error('allRoutes block not found');
// 数组真正的开括号在 "= [" 处，跳过类型标注 RouteDef[]
const eqOpen = serverSrc.indexOf('= [', startIdx);
let depth = 0;
let endIdx = -1;
for (let i = eqOpen; i < serverSrc.length; i++) {
  if (serverSrc[i] === '[') depth++;
  else if (serverSrc[i] === ']') { depth--; if (depth === 0) { endIdx = i; break; } }
}
const block = serverSrc.slice(startIdx, endIdx);
const blockLines = block.split('\n');

// 2a. spread 标识符顺序
const spreadOrder = [];
const spreadRe = /^\s*\.\.\.(\w+)/;
blockLines.forEach((line, i) => {
  const m = line.match(spreadRe);
  if (m) spreadOrder.push({ ident: m[1], line: serverSrc.slice(0, startIdx).split('\n').length + i });
});

// 2b. allRoutes 内联字面量路由（method/path 直接写在数组里）
const inlineRoutes = [];
const inlineRe = /\{\s*method:\s*'([A-Z]+)'\s*,\s*path:\s*'([^']+)'/g;
let mm;
while ((mm = inlineRe.exec(block)) !== null) {
  inlineRoutes.push({ method: mm[1], path: mm[2], file: 'server.ts', line: 0, auth: false });
}

// ---------- 3. 解析路由文件 ----------
// 剥离注释（保留字符串字面量，避免误伤 URL 中的 //）
function stripComments(src) {
  let out = '', i = 0, inStr = null;
  while (i < src.length) {
    const ch = src[i], nx = src[i + 1];
    if (inStr) {
      out += ch;
      if (ch === '\\') { out += nx ?? ''; i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; out += ch; i++; continue; }
    if (ch === '/' && nx === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && nx === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    out += ch; i++;
  }
  return out;
}

function parseRouteFile(file, label) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  const out = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] !== '{') { i++; continue; }
    // 花括号配对（跳过字符串字面量）
    let depth = 0, j = i, inStr = null;
    for (; j < raw.length; j++) {
      const ch = raw[j];
      if (inStr) {
        if (ch === '\\') { j++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    const block = raw.slice(i, j + 1);
    const mm = block.match(/method:\s*['"]([A-Z]+)['"]/);
    const pp = block.match(/path:\s*['"]([^'"]+)['"]/);
    if (mm && pp) {
      const lineNo = raw.slice(0, i).split('\n').length;
      out.push({
        method: mm[1],
        path: pp[1],
        file: label,
        line: lineNo,
        auth: /auth:\s*true/.test(block),
      });
    }
    i = j + 1;
  }
  const seen = new Set();
  return out.filter((r) => {
    const k = `${r.method}|${r.path}|${r.file}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// 3a. server.ts 内本地定义的 const xxxRoutes = [...]
const localDefs = new Map();
const localRe = /const\s+(\w+Routes)\s*:\s*RouteDef\[\]\s*=\s*\[/g;
let lm;
while ((lm = localRe.exec(serverSrc)) !== null) {
  const ident = lm[1];
  // 截取数组体（从 "= [" 开括号起算，跳过 RouteDef[] 类型标注）
  const open = serverSrc.indexOf('= [', lm.index);
  let d = 0, s = open, e = -1;
  for (let i = s; i < serverSrc.length; i++) {
    if (serverSrc[i] === '[') d++;
    else if (serverSrc[i] === ']') { d--; if (d === 0) { e = i; break; } }
  }
  const body = serverSrc.slice(s, e);
  const routes = [];
  const r1 = /method:\s*['"]([A-Z]+)['"]/g;
  let x;
  while ((x = r1.exec(body)) !== null) {
    const win = body.slice(x.index, x.index + 300);
    const pm = win.match(/path:\s*['"]([^'"]+)['"]/);
    if (!pm) continue;
    const lineNo = serverSrc.slice(0, s + x.index).split('\n').length;
    routes.push({ method: x[1], path: pm[1], file: 'server.ts', line: lineNo, auth: /auth:\s*true/.test(win) });
  }
  localDefs.set(ident, routes);
}

// ---------- 4. 汇总全局有序路由表 ----------
const global = [];
const unresolved = [];
for (const s of spreadOrder) {
  let routes = null;
  if (importMap.has(s.ident)) {
    const info = importMap.get(s.ident);
    routes = parseRouteFile(info.file, path.basename(info.file));
    if (routes.length === 0) {
      const raw = fs.existsSync(info.file) ? fs.readFileSync(info.file, 'utf8') : '';
      unresolved.push({
        ident: s.ident,
        reason: raw.includes('path:') ? 'parser-miss (file contains path:)' : 'empty placeholder array',
        file: info.file,
      });
    }
  } else if (localDefs.has(s.ident)) {
    routes = localDefs.get(s.ident);
  } else {
    unresolved.push({ ident: s.ident, reason: 'not imported & not local' });
    continue;
  }
  routes.forEach((r) => global.push({ ...r, spread: s.ident }));
}
inlineRoutes.forEach((r) => global.push({ ...r, spread: '<inline>' }));

// ---------- 5. 遮蔽与重复检测 ----------
function compileRe(pattern) {
  const keys = [];
  const esc = pattern.replace(/\$/g, '\\$');
  const rx = '^' + esc.replace(/:([^/]+)/g, (_m, k) => { keys.push(k); return '([^/]+)'; }) + '$';
  return new RegExp(rx);
}
const shadows = [];
const dupes = [];
const seen = new Map();
const uniqueList = [];
global.forEach((r) => {
  const key = `${r.method} ${r.path}`;
  if (seen.has(key)) dupes.push({ key, first: seen.get(key), later: r });
  else { seen.set(key, r); uniqueList.push(r); }
});
uniqueList.forEach((r, i) => {
  // 仅当后续路由是静态路径时，前面的动态路由才可能遮蔽它
  if (r.path.includes(':')) return;
  for (let j = 0; j < i; j++) {
    const p = uniqueList[j];
    if (p.method !== r.method) continue;
    if (!p.path.includes(':')) continue;
    const rx = compileRe(p.path);
    if (rx.test(r.path)) {
      shadows.push({ dynamic: p, staticLater: r });
      break; // 只记首个遮蔽者
    }
  }
});

// ---------- 6. 计数 ----------
const routesDir = path.join(ROOT, 'src/bff/routes');
const aggDir = path.join(ROOT, 'src/bff/aggregators');
function walk(dir, ext) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full, ext));
    else if (ent.name.endsWith(ext)) out.push(full);
  }
  return out;
}
const routeFiles = walk(routesDir, '.ts');
const aggFiles = walk(aggDir, '.ts');

// ---------- 7. 信封风格扫描（routes 目录） ----------
const style = { ok: 0, fail: 0, rawCodeEnvelope: 0, rawObject: 0, newResponse: 0, filesRaw: new Set() };
const errStatusMismatch = [];
const enumMap = {
  SUCCESS: 200, BAD_REQUEST: 400, UNAUTHORIZED: 401, TOKEN_EXPIRED: 401,
  FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429,
  INTERNAL_ERROR: 500, SERVICE_UNAVAILABLE: 503,
};
for (const f of routeFiles) {
  const src = fs.readFileSync(f, 'utf8');
  style.ok += (src.match(/json\(\s*ok\(/g) || []).length;
  style.fail += (src.match(/json\(\s*fail\(/g) || []).length;
  const rawCode = (src.match(/json\(\s*\{\s*code:\s*\d+/g) || []).length;
  style.rawCodeEnvelope += rawCode;
  if (rawCode > 0) style.filesRaw.add(path.basename(f));
  style.newResponse += (src.match(/new Response\(/g) || []).length;
  // 错误码-状态码配对
  const re = /json\(\s*fail\(\s*ErrorCode\.(\w+)\s*,[^,]+,\s*(?:c\.traceId\s*)?\)\s*,\s*(\d{3})/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const expected = enumMap[m[1]];
    if (expected && Number(m[2]) !== expected) {
      errStatusMismatch.push({ file: path.basename(f), code: m[1], http: m[2], expected });
    }
  }
}

// ---------- 8. 导入但未挂 / 挂了但未导入 ----------
const spreadIdents = new Set(spreadOrder.map((s) => s.ident));
const importedIdents = new Set(importMap.keys());
const importedNotSpread = [...importedIdents].filter((x) => !spreadIdents.has(x));
const spreadNotImported = [...spreadIdents].filter((x) => !importedIdents.has(x) && !localDefs.has(x));

const report = {
  counts: {
    spreadGroups: spreadOrder.length,
    inlineRoutes: inlineRoutes.length,
    registeredEntries: global.length,
    uniqueMethodPath: uniqueList.length,
    routeFiles: routeFiles.length,
    aggregatorFiles: aggFiles.length,
  },
  unresolved,
  unresolvedByReason: unresolved.reduce((a, u) => (a[u.reason] = (a[u.reason] ?? 0) + 1, a), {}),
  importedNotSpread,
  spreadNotImported,
  dupes: dupes.map((d) => ({ key: d.key, first: `${d.first.file}:${d.first.line}`, later: `${d.later.file}:${d.later.line}` })),
  shadows: shadows.map((s) => ({
    dynamic: `${s.dynamic.method} ${s.dynamic.path} @ ${s.dynamic.file}:${s.dynamic.line}`,
    shadowed: `${s.staticLater.method} ${s.staticLater.path} @ ${s.staticLater.file}:${s.staticLater.line}`,
  })),
  style,
  errStatusMismatch,
};

fs.writeFileSync(
  new URL('./audit-report.json', import.meta.url),
  JSON.stringify(report, null, 2),
  'utf8',
);
console.log(JSON.stringify(report.counts, null, 2));
console.log('unresolved:', unresolved.length, JSON.stringify(unresolved.reduce((a, u) => (a[u.reason] = (a[u.reason] ?? 0) + 1, a), {})));
console.log('importedNotSpread:', importedNotSpread.length);
console.log('spreadNotImported:', spreadNotImported.length);
console.log('dupes:', dupes.length);
console.log('shadows:', shadows.length);
console.log('style:', JSON.stringify({ ok: style.ok, fail: style.fail, rawCodeEnvelope: style.rawCodeEnvelope, newResponse: style.newResponse, filesRaw: style.filesRaw.size }));
console.log('errStatusMismatch:', errStatusMismatch.length);
