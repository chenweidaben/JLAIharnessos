/**
 * 健澜AI原生医院操作系统OS - P4-1 全链路审计日志 端到端
 *
 * 真实 HTTP 打 8080，自签 admin/doctor/patient JWT。
 * 可重跑：用 Date.now() 盐值生成唯一 actorId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; rawText?: string; }
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
async function call(method: string, path: string, opts: {token?: string; body?: unknown; raw?: boolean} = {}): Promise<CallResult> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
  const text = await res.text();
  if (opts.raw) return { httpStatus: res.status, code: 0, data: null, rawText: text };
  let raw:any=null; try{raw=JSON.parse(text);}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null };
}

const SALT = Date.now().toString(36);
const DOC = `D-AUD-${SALT}`;
const OTHER = `D-OTHER-${SALT}`;
const PAT = `P-AUD-${SALT}`;
const admin = sign(['admin'], '管理员', 'admin-audit');
const doctorMe = sign(['doctor'], '医生', DOC);
const doctorOther = sign(['doctor'], '另一医生', OTHER);
const patient = sign(['patient'], '患者', PAT);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P4-1 审计日志', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/api/v1/audit/events');
    expect(r.httpStatus).toBe(401);
  });
  it('patient 查审计 → 403', async () => {
    const r = await call('GET','/api/v1/audit/events',{token:patient});
    expect(r.httpStatus).toBe(403);
  });
  it('_seed 灌 20 条（admin）', async () => {
    const items: Array<Record<string,unknown>> = [];
    for (let i = 0; i < 20; i++) {
      items.push({
        actorId: i % 3 === 0 ? DOC : (i % 3 === 1 ? OTHER : 'sys'),
        actorRole: i % 3 === 2 ? 'system' : 'doctor',
        action: ['login','create','view','export','approve','forbidden'][i % 6],
        module: ['cpoe','emr','pharmacy','cds','nqi','portal'][i % 6],
        resourceType: 'order', resourceId: `O-${i}`,
        result: ['success','success','success','failure','forbidden'][i % 5],
      });
    }
    const r = await call('POST','/api/v1/audit/events/_seed',{token:admin,body:{items}});
    expect(r.httpStatus).toBe(200); expect(r.data.seeded).toBe(20);
  });
  it('admin 查全部 total >= 20', async () => {
    const r = await call('GET','/api/v1/audit/events?limit=500',{token:admin});
    expect(r.data.total).toBeGreaterThanOrEqual(20);
  });
  it('doctor 查自己：只返回自己 actorId 的事件', async () => {
    const r = await call('GET',`/api/v1/audit/events`,{token:doctorMe});
    expect(r.data.total).toBeGreaterThan(0);
    for (const row of r.data.rows) expect(row.actorId).toBe(DOC);
  });
  it('doctor 查别人 actorId → 403', async () => {
    const r = await call('GET',`/api/v1/audit/events?actorId=${OTHER}`,{token:doctorMe});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('module 过滤', async () => {
    const r = await call('GET','/api/v1/audit/events?module=cds&limit=500',{token:admin});
    expect(r.data.total).toBeGreaterThan(0);
    for (const row of r.data.rows) expect(row.module).toBe('cds');
  });
  it('result=forbidden 过滤', async () => {
    const r = await call('GET','/api/v1/audit/events?result=forbidden&limit=500',{token:admin});
    expect(r.data.total).toBeGreaterThan(0);
    for (const row of r.data.rows) expect(row.result).toBe('forbidden');
  });
  it('limit > 500 → 400', async () => {
    const r = await call('GET','/api/v1/audit/events?limit=501',{token:admin});
    expect(r.httpStatus).toBe(400);
  });
  it('verify-chain 全绿（admin）', async () => {
    const r = await call('GET','/api/v1/audit/events/verify-chain',{token:admin});
    expect(r.data.valid).toBe(true);
  });
  it('doctor 不能 verify-chain → 403', async () => {
    const r = await call('GET','/api/v1/audit/events/verify-chain',{token:doctorMe});
    expect(r.httpStatus).toBe(403);
  });
  it('admin 导出 CSV 含 header', async () => {
    const r = await call('GET','/api/v1/audit/events/export?format=csv',{token:admin,raw:true});
    expect(r.httpStatus).toBe(200);
    expect(r.rawText).toContain('seq,occurredAt,actorId,actorRole,action,module');
  });
});
