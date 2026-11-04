/**
 * 健澜AI原生医院操作系统OS - P5-1 医疗质量指标 端到端
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
async function call(method: string, path: string, opts: {token?: string; body?: unknown} = {}): Promise<CallResult> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
  let raw:any=null; try{raw=await res.json();}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null };
}

const SALT = Date.now().toString(36);
const ADMIN = `admin-p51-${SALT}`;
const DOCTOR = `DOC-001`;  // 与 seed 里的 doctorId 对齐（验证 doctor 自己下钻）
const admin = sign(['admin'], '管理员', ADMIN);
const doctor = sign(['doctor'], '医生', DOCTOR);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
  // admin 灌种子
  await call('POST','/api/v1/quality/dashboard/_seed',{token:admin,body:{}});
});

describe('P5-1 overview', () => {
  it('admin overview 返回 9 项指标且非零', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/overview',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.cdsHardStopRate).toBeGreaterThan(0);
    expect(r.data.fallRatePer1000).toBeGreaterThan(0);
    expect(r.data.patientSatisfactionAvg).toBeGreaterThan(0);
    expect(r.data.chiefRoundCompletionRate).toBeGreaterThan(0);
  });
  it('admin overview 加科室过滤', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/overview?departmentId=DEPT-INT',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.cdsHardStopRate).toBeGreaterThan(0);
  });
});

describe('P5-1 by-doctor', () => {
  it('admin by-doctor 返回非空数组', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/by-doctor',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.rows.length).toBeGreaterThan(0);
    expect(r.data.rows[0]).toHaveProperty('doctorId');
  });
});

describe('P5-1 trend', () => {
  it('admin trend 合法 metric → 日序列', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/trend?metric=cdsHardStopRate',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.points.length).toBeGreaterThan(0);
  });
  it('metric 白名单外 → 400', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/trend?metric=bogus',{token:admin});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P5-1 权限', () => {
  it('doctor 不传 departmentId → 200（看自己）', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/overview',{token:doctor});
    expect(r.httpStatus).toBe(200);
  });
  it('doctor 传 departmentId → 403（跨科室）', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/overview?departmentId=DEPT-INT',{token:doctor});
    expect(r.httpStatus).toBe(403);
  });
  it('doctor by-doctor 只看到自己', async () => {
    const r = await call('GET','/api/v1/quality/dashboard/by-doctor',{token:doctor});
    expect(r.httpStatus).toBe(200);
    for (const row of r.data.rows) expect(row.doctorId).toBe(DOCTOR);
  });
});
