/**
 * 健澜AI原生医院操作系统OS - P1-3 手术麻醉闭环 端到端
 *
 * 真实 HTTP 打 8080，自签 surgeon/anesthetist/nurse/admin JWT。
 * 可重跑：用唯一 visitId/手术间时段避免跨轮内存漂移；状态流转按返回值逐级驱动。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; raw: any; }
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
  return {httpStatus:res.status, code:raw?.code, data:raw?.data??null, raw};
}

const surgeon = sign(['surgeon'],'外科','sr-p13');
const anes = sign(['anesthetist'],'麻醉','an-p13');
const nurse = sign(['nurse'],'护士','nu-p13');
const admin = sign(['admin'],'管理员','ad-p13');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-3 手术申请与排班', () => {
  it('无 token → 401', async () => {
    const r = await call('POST','/api/v1/surgery-workflow/requests',{body:{visitId:'V',patientId:'P'}});
    expect(r.httpStatus).toBe(401);
  });
  it('surgeon 建申请 → 200 draft', async () => {
    const r = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-S',patientId:'PT-P001',surgeryName:'阑尾切除',plannedDurationMin:90,surgeonId:'sr'}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('draft');
  });
  it('anesthetist 建申请 → 403 code=40300', async () => {
    const r = await call('POST','/api/v1/surgery-workflow/requests',{token:anes,body:{visitId:'V',patientId:'PT-P001',surgeryName:'x',plannedDurationMin:60}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('plannedDurationMin 越界 → 400', async () => {
    const r = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V',patientId:'PT-P001',surgeryName:'x',plannedDurationMin:10}});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P1-3 排班互斥与状态机', () => {
  it('admin 排班 → scheduled；同手术间重叠 → 409', async () => {
    const c1 = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-R1',patientId:'PT-P001',surgeryName:'A',plannedDurationMin:60}});
    const start = Date.now()+50*3600_000;
    const s1 = await call('POST',`/api/v1/surgery-workflow/requests/${c1.data.reqId}/schedule`,{token:admin,body:{orRoom:'OR-9',scheduledStart:start,scheduledEnd:start+3600_000}});
    expect(s1.httpStatus).toBe(200); expect(s1.data.status).toBe('scheduled');
    const c2 = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-R2',patientId:'PT-P001',surgeryName:'B',plannedDurationMin:60}});
    const overlap = await call('POST',`/api/v1/surgery-workflow/requests/${c2.data.reqId}/schedule`,{token:admin,body:{orRoom:'OR-9',scheduledStart:start+1800_000,scheduledEnd:start+5400_000}});
    expect(overlap.httpStatus).toBe(409);
  });
  it('surgeon 排班 → 403', async () => {
    const c = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-NO',patientId:'PT-P001',surgeryName:'C',plannedDurationMin:60}});
    const r = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/schedule`,{token:surgeon,body:{orRoom:'OR-1',scheduledStart:Date.now(),scheduledEnd:Date.now()+3600_000}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('越级跃迁 draft→in_pacu → 409；逐级流转至 in_pacu', async () => {
    const c = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-FLOW',patientId:'PT-P001',surgeryName:'D',plannedDurationMin:60}});
    const bad = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_pacu'}});
    expect(bad.httpStatus).toBe(409);
    // 逐级：scheduled -> in_or -> in_progress -> in_pacu（先排班）
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/schedule`,{token:admin,body:{orRoom:'OR-7',scheduledStart:Date.now()+60*3600_000,scheduledEnd:Date.now()+62*3600_000}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_or'}});
    const ip = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_progress'}});
    expect(ip.data.status).toBe('in_progress');
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_pacu'}});
  });
});

describe('P1-3 麻醉记录与 PACU', () => {
  it('anesthetist 术中记录麻醉 → 200；nurse 记麻醉 → 403', async () => {
    const c = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-AN',patientId:'PT-P001',surgeryName:'E',plannedDurationMin:60}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/schedule`,{token:admin,body:{orRoom:'OR-6',scheduledStart:Date.now()+70*3600_000,scheduledEnd:Date.now()+72*3600_000}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_or'}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_progress'}});
    const ok = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/anesthesia-record`,{token:anes,body:{anesthesiaType:'全麻',drugs:['丙泊酚'],fluidsIn:1200,fluidsOut:300}});
    expect(ok.httpStatus).toBe(200);
    expect(ok.data.anesthesiaRecord.drugs).toEqual(['丙泊酚']);
    const denied = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/anesthesia-record`,{token:nurse,body:{drugs:[]}});
    expect(denied.httpStatus).toBe(403);
  });
  it('nurse PACU 记录 → 200；aldrete 越界 → 400；surgeon 记 PACU → 403', async () => {
    const c = await call('POST','/api/v1/surgery-workflow/requests',{token:surgeon,body:{visitId:'V-E2E-PAC',patientId:'PT-P001',surgeryName:'F',plannedDurationMin:60}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/schedule`,{token:admin,body:{orRoom:'OR-5',scheduledStart:Date.now()+80*3600_000,scheduledEnd:Date.now()+82*3600_000}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_or'}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_progress'}});
    await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/transition`,{token:surgeon,body:{toState:'in_pacu'}});
    const ok = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/pacu-note`,{token:nurse,body:{aldreteScore:9,consciousness:'清醒',painScore:2}});
    expect(ok.httpStatus).toBe(200);
    expect(ok.data.pacuNote.aldreteScore).toBe(9);
    const bad = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/pacu-note`,{token:nurse,body:{aldreteScore:11,consciousness:'x',painScore:2}});
    expect(bad.httpStatus).toBe(400);
    const denied = await call('POST',`/api/v1/surgery-workflow/requests/${c.data.reqId}/pacu-note`,{token:surgeon,body:{aldreteScore:9,consciousness:'x',painScore:0}});
    expect(denied.httpStatus).toBe(403);
  });
  it('GET 列表按 visitId 过滤 → 200 数组', async () => {
    const r = await call('GET','/api/v1/surgery-workflow/requests?visitId=V-E2E-S',{token:surgeon});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(1);
  });
});
