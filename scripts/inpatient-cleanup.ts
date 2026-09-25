/**
 * 健澜科技 jlmedaios - 住院取证数据清理脚本（M1-A）
 *
 * 按患者标签（TAGS，逗号分隔，默认 "A,B"）找出当前在院患者并经 BFF 办理出院，
 * 释放其床位，用于并发/取证脚本运行后恢复床位基线。
 *
 * 用法：bun run scripts/inpatient-cleanup.ts           # 清理标签 A,B
 *      $env:TAGS="A,B,LOAD"; bun run scripts/inpatient-cleanup.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const BASE = process.env.BFF_BASE ?? 'http://127.0.0.1:8080';
const TAGS = (process.env.TAGS ?? 'A,B').split(',').map((s) => s.trim()).filter(Boolean);

async function api<T = any>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json?.data ?? json };
}

async function main(): Promise<void> {
  const login = await api('POST', '/api/v1/auth/login', undefined, {
    username: 'admin',
    password: 'trial-build',
  });
  const token = login.data.tokens.accessToken as string;
  const list = await api('GET', '/api/v1/inpatient/patients', token);
  const items: any[] = list.data.items;
  const targets = items.filter((p) =>
    (p.tags ?? []).some((t: string) => TAGS.includes(t)),
  );
  console.log(`匹配标签 [${TAGS.join(',')}] 的在院患者: ${targets.length}`);
  let done = 0;
  for (const p of targets) {
    const r = await api('POST', `/api/v1/inpatient/patients/${p.visitId}/discharge`, token, {
      reason: '取证数据清理',
    });
    if (r.status === 200) {
      done++;
      console.log(`  出院 ${p.visitNo} 释放床位 ${p.bedNo}`);
    } else {
      console.error(`  出院失败 ${p.visitNo}: ${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
    }
  }
  console.log(`清理完成 ${done}/${targets.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
