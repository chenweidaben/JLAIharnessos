/**
 * 健澜AI原生医院操作系统OS - P5-2 WORM 归档 端到端
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
async function call(method: string, path: string, opts: {token?: string; body?: unknown} = {}): Promise<CallResult> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
  const txt = await res.text();
  let raw:any=null; try{raw=JSON.parse(txt);}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null, raw: txt, headers: res.headers };
}

const SALT = Date.now().toString(36);
const ADMIN = `admin-p52-${SALT}`;
const DOCTOR = `doctor-p52-${SALT}`;
const admin = sign(['admin'], '管理员', ADMIN);
const doctor = sign(['doctor'], '医生', DOCTOR);

async function generateAuditEvents(n: number) {
  for (let i = 0; i < n; i++) {
    await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:`P-${SALT}-${i}`, visitId:`V${i}`, type:'lab', title:'血常规', result:'WBC 6.5', isAbnormal:false,
    }});
  }
}

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P5-2 seal 与链式', () => {
  it('第一批：generate events → seal → 首段 GENESIS', async () => {
    await generateAuditEvents(3);
    const r = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    expect(r.httpStatus).toBe(201);
    expect(r.data.segmentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.data.prevSegmentHash).toBe('GENESIS');
    expect(r.data.eventCount).toBeGreaterThan(0);
    (globalThis as any).__seg1 = r.data.segmentId;
  });
  it('第二批：generate 更多 events → seal → 第二段 prev == 第一段 hash', async () => {
    await generateAuditEvents(2);
    const r = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    expect(r.httpStatus).toBe(201);
    expect(r.data.prevSegmentHash).not.toBe('GENESIS');
    (globalThis as any).__seg2 = r.data.segmentId;
  });
  it('两段 list 非空', async () => {
    const r = await call('GET','/api/v1/worm/segments',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThanOrEqual(2);
  });
});

describe('P5-2 verify 与篡改', () => {
  it('verify 未篡改 → valid=true, segmentCount>=2', async () => {
    const r = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.valid).toBe(true);
    expect(r.data.segmentCount).toBeGreaterThanOrEqual(2);
  });
  it('_tamper 首段后 verify valid=false + brokenSegmentId', async () => {
    const seg1 = (globalThis as any).__seg1;
    const t = await call('POST','/api/v1/worm/_tamper',{token:admin,body:{segmentId:seg1}});
    expect(t.httpStatus).toBe(200);
    const v = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(v.data.valid).toBe(false);
    expect(v.data.brokenSegmentId).toBe(seg1);
  });
});

describe('P5-2 内容读取', () => {
  it('download JSON 含 events 数组', async () => {
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=json`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data.events)).toBe(true);
  });
  it('download CSV 含 header', async () => {
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=csv`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.raw).toMatch(/^seq,occurredAt,actorId/);
  });
  it('format 非法 → 400', async () => {
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=xml`,{token:admin});
    expect(r.httpStatus).toBe(400);
  });
  it('segmentId 不存在 → 404', async () => {
    const r = await call('GET','/api/v1/worm/segments/WORM-nope',{token:admin});
    expect(r.httpStatus).toBe(404);
  });
});

describe('P5-2 权限与幂等', () => {
  it('doctor seal → 403', async () => {
    const r = await call('POST','/api/v1/worm/segments/seal',{token:doctor,body:{}});
    expect(r.httpStatus).toBe(403);
  });
});
