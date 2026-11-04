/**
 * 健澜AI原生医院操作系统OS - P1-2 体温单/医嘱单 端到端
 *
 * 真实 HTTP 打 8080。自签 nurse/doctor JWT。覆盖：
 * 无 token 401、护士录入 200、体温越界 400、医生录入 403、医生查看曲线 200 结构、
 * 医嘱单 continuation/reissue/reprint、printCount 累加、其他角色 403。可重跑。
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
function signToken(roles: string[], name: string, sub: string): string {
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

const nurse = signToken(['nurse'],'护士','nur-p12');
const doctor = signToken(['doctor'],'医生','doc-p12');
const date = new Date().toISOString().slice(0,10);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-2 体温单', () => {
  it('无 token 录入 → 401', async () => {
    const r = await call('POST','/api/v1/nursing/vitals-sheet/entries',{body:{visitId:'V',patientId:'P'}});
    expect(r.httpStatus).toBe(401);
  });
  it('护士录入体征 → 200', async () => {
    const r = await call('POST','/api/v1/nursing/vitals-sheet/entries',{token:nurse,body:{visitId:'V-E2E-V',patientId:'PT-P001',temperatureC:36.8,pulseBpm:78,sbp:120,dbp:75,respirationRate:18,spo2:99}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.temperatureC).toBe(36.8);
  });
  it('体温越界 → 400 含字段名', async () => {
    const r = await call('POST','/api/v1/nursing/vitals-sheet/entries',{token:nurse,body:{visitId:'V-E2E-V',patientId:'PT-P001',temperatureC:43}});
    expect(r.httpStatus).toBe(400);
    expect(JSON.stringify(r.raw)).toContain('体温');
  });
  it('医生录入 → 403 code=40300', async () => {
    const r = await call('POST','/api/v1/nursing/vitals-sheet/entries',{token:doctor,body:{visitId:'V-E2E-V',patientId:'PT-P001',temperatureC:36.5}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('医生查看曲线 → 200 且含六类曲线结构', async () => {
    await call('POST','/api/v1/nursing/vitals-sheet/entries',{token:nurse,body:{visitId:'V-E2E-C',patientId:'PT-P001',temperatureC:37.0,sbp:118,dbp:76}});
    const r = await call('GET',`/api/v1/nursing/vitals-sheet/curve?visitId=V-E2E-C&date=${date}`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data.temperatureCurve)).toBe(true);
    expect(r.data.temperatureCurve.length).toBe(6);
    expect(Array.isArray(r.data.bpSeries)).toBe(true);
    expect(r.data.date).toBe(date);
  });
});

describe('P1-2 医嘱单打印', () => {
  it('护士 continuation 续打 → 200 且下次续打页码递增', async () => {
    const r1 = await call('POST','/api/v1/clinical/order-sheet/print',{token:nurse,body:{visitId:'V-E2E-P',patientId:'PT-P001',printMode:'continuation'}});
    expect(r1.httpStatus).toBe(200);
    expect(r1.data.printMode).toBe('continuation');
    expect(r1.data.nextPage).toBe(r1.data.pageFrom);
    const r2 = await call('POST','/api/v1/clinical/order-sheet/print',{token:nurse,body:{visitId:'V-E2E-P',patientId:'PT-P001',printMode:'continuation'}});
    expect(r2.data.nextPage).toBe(r1.data.nextPage + 1);
  });
  it('reissue 补打 → reissuedPages 含 range', async () => {
    const r = await call('POST','/api/v1/clinical/order-sheet/print',{token:nurse,body:{visitId:'V-E2E-P',patientId:'PT-P001',printMode:'reissue',range:{from:2,to:3}}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.reissuedPages).toEqual([2,3]);
  });
  it('reprint 重打且同模式 printCount 累加（相对）', async () => {
    const r1 = await call('POST','/api/v1/clinical/order-sheet/print',{token:nurse,body:{visitId:'V-E2E-R',patientId:'PT-P001',printMode:'reprint'}});
    const r2 = await call('POST','/api/v1/clinical/order-sheet/print',{token:nurse,body:{visitId:'V-E2E-R',patientId:'PT-P001',printMode:'reprint'}});
    expect(r1.httpStatus).toBe(200);
    expect(r2.data.printCount).toBe(r1.data.printCount + 1);
  });
  it('非法 printMode → 400', async () => {
    const r = await call('POST','/api/v1/clinical/order-sheet/print',{token:nurse,body:{visitId:'V',patientId:'PT-P001',printMode:'bogus'}});
    expect(r.httpStatus).toBe(400);
  });
  it('GET 打印历史 → 200 数组', async () => {
    const r = await call('GET','/api/v1/clinical/order-sheet/prints?visitId=V-E2E-P',{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(2);
  });
});
