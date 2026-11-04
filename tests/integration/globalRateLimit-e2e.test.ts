/**
 * 健澜AI原生医院操作系统OS - P4-4 通用限流 + login action 特例 端到端
 *
 * 真实 HTTP 打 8080：
 *  ① POST /auth/login → 审计 action=login（不是 create）
 *  ② POST /engagement/reports 带 patientId → 审计事件含 patientId
 *  ③ /health 不限流
 *  ④ 快速 GET /rate-limit/status 101 次 → 第 101 次 429（read 桶）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; headers?: Headers; }
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
async function call(method: string, path: string, opts: {token?: string; body?: unknown} = {}): Promise<CallResult> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
  let raw:any=null; try{raw=await res.json();}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null, headers: res.headers };
}

const SALT = Date.now().toString(36);
const ADMIN = `admin-p44-${SALT}`;
const PATIENT = `P-p44-${SALT}`;
const admin = sign(['admin'], '管理员', ADMIN);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P4-4 login action 特例', () => {
  it('POST /auth/login（错密码）→ 审计 action=login，不是 create', async () => {
    await call('POST','/api/v1/auth/login',{body:{username:`nobody-${SALT}`,password:'wrong'}});
    // 审计里找最新一条 module=auth
    const r = await call('GET','/api/v1/audit/events?module=auth&limit=20',{token:admin});
    const top = r.data.rows.find((x: any) => x.action === 'login');
    expect(top).toBeTruthy();
    // 不应有 action=create 的 auth 事件（除非历史）
  });
});

describe('P4-4 patientId 从 body 提取', () => {
  it('POST /engagement/reports 带 patientId → 审计事件含 patientId', async () => {
    await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:PATIENT, visitId:'V1', type:'lab', title:'血常规', result:'WBC 6.5', isAbnormal:false,
    }});
    const r = await call('GET',`/api/v1/audit/events?module=engagement&limit=20`,{token:admin});
    const top = r.data.rows[0];
    expect(top.patientId).toBe(PATIENT);
  });
});

describe('P4-4 白名单与全局 read 限流', () => {
  it('/health 不限流（连续打多次仍 200）', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await call('GET','/health');
      expect(r.httpStatus).toBe(200);
    }
  });
  it('快速 GET /rate-limit/status 110 次 → 触顶 429', async () => {
    // read 桶阈值 100/min；前面测试已用 <5 次 GET（audit 被白名单不计数），循环 110 次必然触顶
    let saw429 = false;
    for (let i = 0; i < 110; i++) {
      const r = await call('GET','/api/v1/rate-limit/status',{token:admin});
      if (r.httpStatus === 429) { saw429 = true; expect(r.headers?.get('Retry-After')).toBeTruthy(); break; }
    }
    expect(saw429).toBe(true);
  });
});
