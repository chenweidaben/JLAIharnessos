/**
 * 健澜AI原生医院操作系统OS - P5-2 WORM 归档 端到端（影子探针版）
 *
 * 本测试在同一 BFF 进程内连跑两轮（不重启），验证：
 *  - _tamper 不再污染真实段
 *  - verify?scope=real 永远 valid=true
 *  - 探针 reset 后 verify all 恢复 valid
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; raw?: string; }
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
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null, raw: txt };
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
  // 每轮开始前清空探针，避免上轮残留
  await call('POST','/api/v1/worm/_probes/reset',{token:admin,body:{}});
});

describe('P5-2 seal 与链式', () => {
  it('第一批：generate events → seal → 段生成', async () => {
    await generateAuditEvents(3);
    const r = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    expect(r.httpStatus).toBe(201);
    expect(r.data.segmentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.data.eventCount).toBeGreaterThan(0);
    (globalThis as any).__seg1 = r.data.segmentId;
  });
  it('第二批：generate 更多 events → seal → 第二段 prev 非空', async () => {
    await generateAuditEvents(2);
    const r = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    expect(r.httpStatus).toBe(201);
    expect(r.data.prevSegmentHash).toBeTruthy();
    (globalThis as any).__seg2 = r.data.segmentId;
  });
});

describe('P5-2 影子探针（不污染真实段）', () => {
  it('verify?scope=real 未篡改 → realChainValid=true', async () => {
    const r = await call('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.realChainValid).toBe(true);
  });
  it('_tamper 生成影子探针，不污染真实段', async () => {
    const seg1 = (globalThis as any).__seg1;
    const t = await call('POST','/api/v1/worm/_tamper',{token:admin,body:{segmentId:seg1}});
    expect(t.httpStatus).toBe(200);
    expect(t.data.probeId).toMatch(/^VERIFY-PROBE-/);
    expect(t.data.expectedBroken).toBe(true);
    // 真实段查询仍 200（未被探针污染）
    const seg = await call('GET',`/api/v1/worm/segments/${seg1}`,{token:admin});
    expect(seg.httpStatus).toBe(200);
    expect(seg.data.segmentHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it('verify?scope=real 在探针存在时仍 realChainValid=true（关键自检）', async () => {
    const r = await call('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(r.data.realChainValid).toBe(true);
  });
  it('verify?scope=all 默认 → valid=false + brokenScope=probe', async () => {
    const r = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(r.data.valid).toBe(false);
    expect(r.data.realChainValid).toBe(true);
    expect(r.data.probeBroken).toBe(true);
    expect(r.data.brokenScope).toBe('probe');
  });
  it('_probes/reset 后 verify?scope=all 恢复 valid=true', async () => {
    await call('POST','/api/v1/worm/_probes/reset',{token:admin,body:{}});
    const r = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(r.data.valid).toBe(true);
    expect(r.data.probeBroken).toBe(false);
  });
});

describe('P5-2 内容读取与权限', () => {
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
  it('doctor seal → 403', async () => {
    const r = await call('POST','/api/v1/worm/segments/seal',{token:doctor,body:{}});
    expect(r.httpStatus).toBe(403);
  });
});
