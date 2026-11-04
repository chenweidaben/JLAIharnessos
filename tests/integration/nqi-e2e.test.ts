/**
 * 健澜AI原生医院操作系统OS - P2-4 护理 NQI 端到端
 *
 * 真实 HTTP 打 8080，自签 nurse/doctor JWT。
 * 可重跑：用 Date.now() 盐值生成唯一 visitId/departmentId。
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
  return {httpStatus:res.status, code:raw?.code, data:raw?.data??null};
}

const SALT = Date.now().toString(36);
const VID = `V-NQI-${SALT}`;
const DEP = `D-NQI-${SALT}`;
const nurse = sign(['nurse'], '护士', 'nurse-nqi');
const doctor = sign(['doctor'], '医生', 'doc-nqi');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P2-4 NQI 上报与看板', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/api/v1/nqi/events');
    expect(r.httpStatus).toBe(401);
  });
  it('doctor 上报 fall → 403', async () => {
    const r = await call('POST','/api/v1/nqi/events/fall',{token:doctor,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T08:00:00Z',severity:'mild',morseScore:50}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('nurse 上报 fall + 枚举非法 → 400', async () => {
    const ok = await call('POST','/api/v1/nqi/events/fall',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T08:00:00Z',severity:'mild',morseScore:50}});
    expect(ok.httpStatus).toBe(200); expect(ok.data.eventId).toMatch(/^NQI-F-/);
    const bad = await call('POST','/api/v1/nqi/events/fall',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T08:00:00Z',severity:'extreme',morseScore:50}});
    expect(bad.httpStatus).toBe(400);
  });
  it('Morse 越界 → 400', async () => {
    const r = await call('POST','/api/v1/nqi/events/fall',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'x',severity:'mild',morseScore:200}});
    expect(r.httpStatus).toBe(400);
  });
  it('压疮上报 + stage 非法 400', async () => {
    const ok = await call('POST','/api/v1/nqi/events/pressure-ulcer',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T09:00:00Z',source:'hospital',stage:'II',bradenScore:16}});
    expect(ok.httpStatus).toBe(200);
    const bad = await call('POST','/api/v1/nqi/events/pressure-ulcer',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T09:00:00Z',source:'hospital',stage:'V',bradenScore:16}});
    expect(bad.httpStatus).toBe(400);
  });
  it('管路滑脱上报', async () => {
    const r = await call('POST','/api/v1/nqi/events/tube-displacement',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T10:00:00Z',catheterType:'cvc',reason:'accidental',reinserted:true}});
    expect(r.httpStatus).toBe(200); expect(r.data.details.catheterType).toBe('cvc');
  });
  it('约束开始 + assess + release + 重复 release 409', async () => {
    const start = await call('POST','/api/v1/nqi/events/restraint',{token:nurse,body:{visitId:VID,patientId:'P',departmentId:DEP,occurredAt:'2026-11-04T11:00:00Z',restraintType:'physical',appliedAt:'2026-11-04T11:00:00Z',rationale:'防拔管'}});
    expect(start.httpStatus).toBe(200);
    const id = start.data.eventId;
    const a = await call('POST',`/api/v1/nqi/events/restraint/${id}/assess`,{token:nurse,body:{at:'2026-11-05T11:00:00Z',rationale:'仍躁动',alternativesTried:['家属陪伴']}});
    expect(a.httpStatus).toBe(200);
    const rel = await call('POST',`/api/v1/nqi/events/restraint/${id}/release`,{token:nurse,body:{removedAt:'2026-11-06T11:00:00Z'}});
    expect(rel.httpStatus).toBe(200);
    const dup = await call('POST',`/api/v1/nqi/events/restraint/${id}/release`,{token:nurse,body:{removedAt:'2026-11-07T11:00:00Z'}});
    expect(dup.httpStatus).toBe(409);
  });
  it('staffing 录入 + dashboard 发生率计算', async () => {
    const s = await call('POST','/api/v1/nqi/staffing',{token:nurse,body:{departmentId:DEP,date:'2026-11-01',beds:40,nurses:10,inpatients:40}});
    expect(s.httpStatus).toBe(200);
    const d = await call('GET',`/api/v1/nqi/dashboard?month=2026-11&departmentId=${DEP}`,{token:nurse});
    expect(d.httpStatus).toBe(200);
    // 40 住院日，至少 1 fall 已上报
    expect(d.data.totalInpatientDays).toBe(40);
    expect(d.data.fallCount).toBeGreaterThanOrEqual(1);
    expect(d.data.fallRatePer1000).toBeGreaterThan(0);
  });
  it('列表过滤 departmentId', async () => {
    const r = await call('GET',`/api/v1/nqi/events?departmentId=${DEP}`,{token:nurse});
    expect(r.httpStatus).toBe(200);
    expect(r.data.length).toBeGreaterThanOrEqual(4);
  });
});
