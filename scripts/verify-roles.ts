/**
 * v5.0试点扩展（M184角色验证）：多角色权限分层验证脚本
 *
 * 做什么（直接打运行中的 BFF，DEMO_MODE=1，不走浏览器）：
 *  1. 分别以 doctor_li / nurse_wang / pharmacist_zhang / patient_test 登录，
 *     拿到真实签发的 JWT；
 *  2. 用该 JWT 调 GET /api/v1/auth/permissions  → 统计权限码条数（含去重后）；
 *  3. 用该 JWT 调 GET /api/v1/auth/menus        → 统计顶层菜单数与叶子菜单数；
 *  4. 403 越权探测：
 *       - patient_test  GET /api/v1/order/list  （任务指定路径，预期 403）
 *       - patient_test  GET /api/v1/orders      （真实医嘱列表路由，旁证）
 *       - doctor_li     GET /api/v1/admin/users （admin 专属，预期 403）
 *
 * 运行：
 *   ~\.bun\bin\bun.exe scripts/verify-roles.ts
 *   （前提：BFF 已在 localhost:8080 运行，且 DEMO_MODE=1）
 *
 * 本脚本只做只读探测，不写业务数据、不改业务代码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */

const BFF_BASE = process.env.BFF_BASE ?? `http://localhost:${process.env.HTTP_PORT ?? 8080}`;

type RoleCase = {
  username: string;
  expectPerm: number; // 任务给出的预期权限数（用于对照）
  label: string;
};

const ROLES: RoleCase[] = [
  { username: 'doctor_li',     expectPerm: 89, label: '李医生（doctor）' },
  { username: 'nurse_wang',    expectPerm: 65, label: '王护士（nurse）' },
  { username: 'pharmacist_zhang', expectPerm: 15, label: '张药师（pharmacist）' },
  { username: 'patient_test',  expectPerm: 7,  label: '测试患者（patient）' },
];

async function login(username: string): Promise<{ accessToken: string; permissions: string[]; rawRoles: string[] }> {
  const res = await fetch(`${BFF_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ username, password: 'demo123' }),
  });
  if (!res.ok) throw new Error(`登录 ${username} 失败: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  return {
    accessToken: json.data.tokens.accessToken,
    permissions: json.data.user.permissions ?? [],
    rawRoles: json.data.user.rawRoles ?? [],
  };
}

async function getJson<T = any>(url: string, token: string): Promise<{ status: number; body: T | null }> {
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      redirect: 'manual',
    });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: res.status, body: body as T };
  } catch (err) {
    return { status: 0, body: (err as Error).message as any };
  }
}

function samplePerms(perms: string[], n = 6): string[] {
  // 取前面若干条作为关键权限示例
  return perms.slice(0, n);
}

interface RoleReport {
  username: string;
  label: string;
  rawRoles: string[];
  expectPerm: number;
  permCountRaw: number;
  permCountUnique: number;
  menuTopCount: number;
  menuLeafCount: number;
  menuTitles: string[];
  permSamples: string[];
}

async function verifyRole(rc: RoleCase): Promise<RoleReport> {
  const { accessToken, permissions, rawRoles } = await login(rc.username);

  // 权限清单（API 实际返回）
  const permRes = await getJson(`${BFF_BASE}/api/v1/auth/permissions`, accessToken);
  const permList: any[] = permRes.body?.data ?? [];
  const rawCount = Array.isArray(permList) ? permList.length : permissions.length;
  const uniqueCount = new Set(Array.isArray(permList) ? permList.map((x) => x.code) : permissions).size;

  // 菜单清单
  const menuRes = await getJson(`${BFF_BASE}/api/v1/auth/menus`, accessToken);
  const menuList: any[] = menuRes.body?.data ?? [];
  let topCount = 0, leafCount = 0;
  const titles: string[] = [];
  for (const m of menuList) {
    topCount++;
    titles.push(m.title ?? m.id);
    if (Array.isArray(m.children)) {
      leafCount += m.children.length;
      for (const ch of m.children) titles.push('  └ ' + (ch.title ?? ch.id));
    } else {
      leafCount += 1;
    }
  }

  return {
    username: rc.username,
    label: rc.label,
    rawRoles,
    expectPerm: rc.expectPerm,
    permCountRaw: rawCount,
    permCountUnique: uniqueCount,
    menuTopCount: topCount,
    menuLeafCount: leafCount,
    menuTitles: titles,
    permSamples: samplePerms(Array.isArray(permList) ? permList.map((x) => x.code) : permissions),
  };
}

async function main() {
  console.log('==================================================================');
  console.log(' 健澜科技 · 多角色权限分层验证（v5.0试点扩展 · M184角色验证）');
  console.log('==================================================================');
  console.log(`BFF: ${BFF_BASE}  (DEMO_MODE=1)`);
  console.log('');

  // 探活
  const health = await fetch(`${BFF_BASE}/health`).then((r) => r.status).catch(() => 0);
  if (health !== 200) {
    console.error(`[FATAL] BFF 不可用 (health=${health})，终止。`);
    process.exit(3);
  }

  const reports: RoleReport[] = [];
  for (const rc of ROLES) {
    const rep = await verifyRole(rc);
    reports.push(rep);
    console.log(`【${rep.label}】(${rep.username})`);
    console.log(`  角色码        : [${rep.rawRoles.join(', ')}]`);
    console.log(`  权限数(API原始): ${rep.permCountRaw}  (预期 ~${rep.expectPerm}; 去重后 ${rep.permCountUnique})`);
    console.log(`  菜单数        : 顶层 ${rep.menuTopCount} / 叶子 ${rep.menuLeafCount}`);
    console.log(`  关键权限示例  : ${rep.permSamples.join(', ')}`);
    console.log(`  可见菜单      :`);
    for (const t of rep.menuTitles) console.log(`      ${t}`);
    console.log('');
  }

  // ---- 403 越权探测 ----
  console.log('------------------------------------------------------------------');
  console.log(' 越权 / 403 探测');
  console.log('------------------------------------------------------------------');

  const patient = await login('patient_test');
  const doctor  = await login('doctor_li');

  const probes = [
    { who: 'patient_test', token: patient.accessToken, url: '/api/v1/order/list', expect: 403, note: '任务指定路径' },
    { who: 'patient_test', token: patient.accessToken, url: '/api/v1/orders',      expect: 403, note: '真实医嘱列表路由（旁证）' },
    { who: 'doctor_li',   token: doctor.accessToken,  url: '/api/v1/admin/users', expect: 403, note: 'admin 用户管理' },
  ];

  const probeResults: any[] = [];
  for (const p of probes) {
    const r = await getJson(`${BFF_BASE}${p.url}`, p.token);
    const bodySnippet = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)?.slice(0, 160);
    const pass = r.status === p.expect;
    console.log(`  [${pass ? 'PASS' : 'NOTE'}] ${p.who} GET ${p.url}`);
    console.log(`        实际 HTTP ${r.status}  | 预期 ${p.expect}  | ${p.note}`);
    console.log(`        响应片段: ${bodySnippet}`);
    probeResults.push({ ...p, actual: r.status, bodySnippet });
  }

  // ---- 机器可读汇总（供写文档） ----
  console.log('');
  console.log('==================================================================');
  console.log(' JSON_SUMMARY_BEGIN');
  console.log(JSON.stringify({ reports, probeResults }, null, 2));
  console.log(' JSON_SUMMARY_END');
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});
