/**
 * 健澜AI原生医院操作系统OS - P4-3 登录防爆破+速率限制 端到端
 *
 * 真实 HTTP 打 8080：
 *  ① 错密码 5 次 → 第 6 次 423（账号锁定）
 *  ② admin unlock → 解锁
 *  ③ 同 IP 快速打 /auth/login 21 次 → 429（IP 封禁）
 *  ④ admin /status 返回非空
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; }
function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function sign(roles: string[], name: string, sub: string): string {
  const now = Math.floor(Date.now()/1000);
  const h = b64url({alg:'HS256',typ:'JWT'});
  const p = b64url({sub,name,roles,iss:'jianlan-bff',nbf:now,exp:now+3600});
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256',JWT_SECRET).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}
async function login(username: string, password: string): Promise<CallResult> {
  const res = await fetch(BASE+'/api/v1/auth/login',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password }),
  });
  let raw:any=null; try{raw=await res.json();}catch{raw=null;}
  return { httpStatus: res.status, code: raw?.code ?? 0, data: raw?.data ?? null };
}
async function call(method: string, path: string, opts: {token?: string; body?: unknown} = {}): Promise<CallResult> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
  let raw:any=null; try{raw=await res.json();}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null };
}

const SALT = Date.now().toString(36);
const LOCK_USER = `lockme-${SALT}`;
const ADMIN = `admin-rl-${SALT}`;
const admin = sign(['admin'], '管理员', ADMIN);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P4-3 账号锁定（423）', () => {
  it('错密码 5 次后第 6 次 423 锁定', async () => {
    // 前 5 次：任意用户名（未登记）→ 400/401，失败计数累加
    for (let i = 0; i < 5; i++) {
      const r = await login(LOCK_USER, `wrong-${i}`);
      // 前 5 次不应是 423
      expect(r.httpStatus).not.toBe(423);
    }
    // 第 6 次：即使密码"对"（任意），也应 423
    const r = await login(LOCK_USER, 'whatever');
    expect(r.httpStatus).toBe(423);
    expect(r.code).toBe(42300);
  });
  it('admin /status 能看到该锁定账号', async () => {
    const r = await call('GET','/api/v1/rate-limit/status',{token:admin});
    expect(r.httpStatus).toBe(200);
    const found = r.data.items.find((x: any) => x.key === LOCK_USER && x.type === 'account');
    expect(found).toBeTruthy();
  });
  it('admin unlock 后账号解锁', async () => {
    const r = await call('POST','/api/v1/rate-limit/unlock',{token:admin,body:{key:LOCK_USER,type:'account'}});
    expect(r.data.removed).toBe(true);
    // 解锁后再登录（仍错密码）应回到 400/401，不再是 423
    const after = await login(LOCK_USER, 'nope');
    expect(after.httpStatus).not.toBe(423);
  });
});

describe('P4-3 IP 防爆破（429）', () => {
  it('同 IP 快速打 21 次 → 429', async () => {
    // 用随机用户名，避免触发账号锁定分支掩盖 IP 429
    let saw429 = false;
    for (let i = 0; i < 25; i++) {
      const r = await login(`ipstorm-${SALT}-${i}`, 'x');
      if (r.httpStatus === 429) { saw429 = true; break; }
    }
    expect(saw429).toBe(true);
  });
});
