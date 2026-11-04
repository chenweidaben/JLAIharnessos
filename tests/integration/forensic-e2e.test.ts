/**
 * 健澜AI原生医院操作系统OS - P4-5 操作回放与取证包 端到端
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; raw?: string; headers?: Headers; }
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
  const txt = await res.text();
  let raw:any=null; try{raw=JSON.parse(txt);}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null, raw: txt, headers: res.headers };
}

const SALT = Date.now().toString(36);
const ADMIN = `admin-p45-${SALT}`;
const DOCTOR = `doctor-p45-${SALT}`;
const PATIENT = `P-p45-${SALT}`;
const admin = sign(['admin'], '管理员', ADMIN);
const doctor = sign(['doctor'], '医生', DOCTOR);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
  // 灌种子：admin 发一个带 patientId 的报告，after-hook 会落审计
  await call('POST','/api/v1/engagement/reports',{token:admin,body:{
    patientId:PATIENT, visitId:'V1', type:'lab', title:'血常规', result:'WBC 6.5', isAbnormal:false,
  }});
});

describe('P4-5 回放', () => {
  it('admin replay actorId=admin → 非空', async () => {
    const r = await call('GET',`/api/v1/forensic/replay?actorId=${encodeURIComponent(ADMIN)}&limit=20`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThan(0);
  });
  it('admin replay-by-patient patientId=xxx → 含相关事件', async () => {
    const r = await call('GET',`/api/v1/forensic/replay-by-patient?patientId=${encodeURIComponent(PATIENT)}`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThan(0);
    expect(r.data.rows[0].patientId).toBe(PATIENT);
  });
  it('actorId 和 patientId 都不给 → 400', async () => {
    const r = await call('GET','/api/v1/forensic/replay',{token:admin});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P4-5 权限', () => {
  it('doctor replay 自己 → 200', async () => {
    const r = await call('GET',`/api/v1/forensic/replay?actorId=${encodeURIComponent(DOCTOR)}`,{token:doctor});
    expect(r.httpStatus).toBe(200);
  });
  it('doctor replay 别人 → 403', async () => {
    const r = await call('GET',`/api/v1/forensic/replay?actorId=${encodeURIComponent(ADMIN)}`,{token:doctor});
    expect(r.httpStatus).toBe(403);
  });
  it('doctor 生成取证包 → 403', async () => {
    const r = await call('POST','/api/v1/forensic/packages',{token:doctor,body:{actorId:ADMIN}});
    expect(r.httpStatus).toBe(403);
  });
});

describe('P4-5 取证包', () => {
  it('admin 生成取证包 → packageId + hashChainValid=true', async () => {
    const r = await call('POST','/api/v1/forensic/packages',{token:admin,body:{patientId:PATIENT}});
    expect(r.httpStatus).toBe(201);
    expect(r.data.packageId).toMatch(/^FP-/);
    expect(r.data.hashChainValid).toBe(true);
    (globalThis as any).__pkgId = r.data.packageId;
  });
  it('GET package/:id 元信息', async () => {
    const id = (globalThis as any).__pkgId;
    const r = await call('GET',`/api/v1/forensic/packages/${id}`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.eventCount).toBeGreaterThan(0);
  });
  it('download JSON 含 events 数组', async () => {
    const id = (globalThis as any).__pkgId;
    const r = await call('GET',`/api/v1/forensic/packages/${id}/download?format=json`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data.events)).toBe(true);
  });
  it('download CSV 含 header 行', async () => {
    const id = (globalThis as any).__pkgId;
    const r = await call('GET',`/api/v1/forensic/packages/${id}/download?format=csv`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.raw).toMatch(/^seq,occurredAt,actorId/);
  });
  it('packageId 不存在 → 404', async () => {
    const r = await call('GET','/api/v1/forensic/packages/FP-nope',{token:admin});
    expect(r.httpStatus).toBe(404);
  });
});
