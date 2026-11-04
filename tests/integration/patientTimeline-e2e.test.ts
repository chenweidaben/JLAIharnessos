/**
 * 健澜AI原生医院操作系统OS - P2-3 患者时间线 端到端
 *
 * 真实 HTTP 打 8080，自签 doctor/patient JWT；_seed 灌样本。
 * 可重跑：用 Date.now() 盐值生成唯一 patientId。
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
const PID = `P-PT-${SALT}`;
const otherPID = `P-OTHER-${SALT}`;
const doctor = sign(['doctor'], '医生', 'doc-pt');
const patientSelf = sign(['patient'], '患者本人', PID);
const patientOther = sign(['patient'], '另一患者', otherPID);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P2-3 _seed + events', () => {
  it('无 token → 401', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events`);
    expect(r.httpStatus).toBe(401);
  });
  it('_seed 灌 30 条样本', async () => {
    const types = ['lab','imaging','medication','surgery','nursing','cds','encounter'];
    const samples = Array.from({length:30},(_,i)=>({
      visitId:`V${i}`, type: types[i%7] as any,
      time:`2026-11-${String((i%28)+1).padStart(2,'0')}T08:00:00Z`,
      summary:`事件${i}`, detailRef:`/ref/${i}`,
    }));
    const r = await call('POST','/api/v1/patient-timeline/_seed',{token:doctor,body:{patientId:PID,samples}});
    expect(r.httpStatus).toBe(200); expect(r.data.seeded).toBe(30);
  });
  it('默认 limit=50，30 条全返，倒序', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events`,{token:doctor});
    expect(r.data.total).toBe(30); expect(r.data.events.length).toBe(30);
    // 倒序：第一条 time >= 第二条
    expect(r.data.events[0].time >= r.data.events[1].time).toBe(true);
  });
  it('limit=10 offset=10 分页', async () => {
    const p1 = await call('GET',`/api/v1/patient-timeline/${PID}/events?limit=10&offset=0`,{token:doctor});
    const p2 = await call('GET',`/api/v1/patient-timeline/${PID}/events?limit=10&offset=10`,{token:doctor});
    expect(p1.data.events.length).toBe(10); expect(p2.data.events.length).toBe(10);
    const ids1 = new Set(p1.data.events.map((e:any)=>e.eventId));
    expect(p2.data.events.every((e:any)=>!ids1.has(e.eventId))).toBe(true);
  });
  it('limit>200 → 400', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events?limit=201`,{token:doctor});
    expect(r.httpStatus).toBe(400);
  });
  it('type=lab 过滤', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events?type=lab`,{token:doctor});
    expect(r.data.total).toBeGreaterThan(0);
    expect(r.data.events.every((e:any)=>e.type==='lab')).toBe(true);
  });
  it('from/to 时间过滤', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events?from=2026-11-02T00:00:00Z&to=2026-11-05T23:59:59Z`,{token:doctor});
    expect(r.data.total).toBeGreaterThan(0);
    expect(r.data.events.every((e:any)=>e.time>='2026-11-02' && e.time<='2026-11-05T23:59:59Z')).toBe(true);
  });
  it('非法 type → 400', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events?type=unknown`,{token:doctor});
    expect(r.httpStatus).toBe(400);
  });
  it('非法时间 → 400', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/events?from=bogus`,{token:doctor});
    expect(r.httpStatus).toBe(400);
  });
  it('summary byType 计数 + timeRange', async () => {
    const r = await call('GET',`/api/v1/patient-timeline/${PID}/summary`,{token:doctor});
    expect(r.data.totalEvents).toBe(30);
    expect(r.data.byType.lab).toBeGreaterThan(0);
    expect(r.data.timeRange.earliest).toBeTruthy();
    expect(r.data.timeRange.latest).toBeTruthy();
  });
  it('patient 看自己 → 200；patient 看别人 → 403', async () => {
    const self = await call('GET',`/api/v1/patient-timeline/${PID}/events`,{token:patientSelf});
    expect(self.httpStatus).toBe(200);
    const other = await call('GET',`/api/v1/patient-timeline/${PID}/events`,{token:patientOther});
    expect(other.httpStatus).toBe(403); expect(other.code).toBe(40300);
  });
});
