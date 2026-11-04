/**
 * 健澜AI原生医院操作系统OS - P0-7 收尾深化 端到端
 *
 * 真实 HTTP 打 8080（DEMO_MODE）。覆盖 POST /api/v1/auth/login：
 * 正确口令 200 发 JWT、错误口令 401(40101)、未知用户 401(40101)、缺字段 400。
 * 可重跑。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';

async function postLogin(body: unknown): Promise<{ status: number; code: number; data: any }> {
  const res = await fetch(BASE + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let raw: any = null;
  try { raw = await res.json(); } catch { /* ignore */ }
  return { status: res.status, code: raw?.code, data: raw?.data ?? null };
}

beforeAll(async () => {
  const health = await fetch(BASE + '/health');
  if (health.status !== 200) throw new Error('BFF 未就绪');
});

describe('P0-7 真实口令登录', () => {
  it('正确口令 → 200 且下发 accessToken', async () => {
    const r = await postLogin({ username: 'demo-doctor', password: 'Demo@Doctor1' });
    expect(r.status).toBe(200);
    expect(r.data.tokens.accessToken).toBeTruthy();
    expect(r.data.user.rawRoles).toContain('doctor');
  });

  it('admin 正确口令 → 200 permissions 含 *', async () => {
    const r = await postLogin({ username: 'demo-admin', password: 'Demo@Admin1' });
    expect(r.status).toBe(200);
    expect(r.data.user.permissions).toContain('*');
  });

  it('错误口令 → 401 code=40101', async () => {
    const r = await postLogin({ username: 'demo-doctor', password: 'wrong-pass' });
    expect(r.status).toBe(401);
    expect(r.code).toBe(40101);
  });

  it('未知用户 → 401 code=40101（不区分原因防枚举）', async () => {
    const r = await postLogin({ username: 'ghost_user', password: 'whatever' });
    expect(r.status).toBe(401);
    expect(r.code).toBe(40101);
  });

  it('缺密码字段 → 400', async () => {
    const r = await postLogin({ username: 'demo-doctor' });
    expect(r.status).toBe(400);
  });

  it('nurse 口令登录 → 200 角色 nurse', async () => {
    const r = await postLogin({ username: 'demo-nurse', password: 'Demo@Nurse1' });
    expect(r.status).toBe(200);
    expect(r.data.user.rawRoles).toContain('nurse');
  });
});
