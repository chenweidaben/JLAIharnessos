/**
 * 健澜AI原生医院操作系统OS - P0-5 中途结算/一日清单推送 端到端
 *
 * 真实 HTTP 打 8080。自签 cashier/doctor/nurse JWT。覆盖：
 * 无 token 401、doctor/nurse 结算 403(code=40300)、cashier 中途结算 200(type=mid)、
 * items 空 400、行级错配 403、一日清单推送 200 字段齐全、同日重复推送幂等同号、
 * doctor 推送 403。
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

const cashier = signToken(['cashier'],'收费员钱','cashier-p05');
const doctor = signToken(['doctor'],'医生甲','doc-p05');
const nurse = signToken(['nurse'],'护士乙','nurse-p05');
const VISIT='VISIT-B200'; const PATIENT='PT-P002';

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P0-5 鉴权', () => {
  it('无 token 中途结算 → 401', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/mid-settlements',{body:{visitId:VISIT,patientId:PATIENT,items:[{name:'x',cents:100}]}});
    expect(r.httpStatus).toBe(401);
  });
});

describe('P0-5 中途结算权限', () => {
  it('doctor 中途结算 → 403 code=40300', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/mid-settlements',{token:doctor,body:{visitId:VISIT,patientId:PATIENT,items:[{name:'x',cents:100}]}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('nurse 中途结算 → 403 code=40300', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/mid-settlements',{token:nurse,body:{visitId:VISIT,patientId:PATIENT,items:[{name:'x',cents:100}]}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
});

describe('P0-5 中途结算业务', () => {
  it('cashier 中途结算 → 200 type=mid', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/mid-settlements',{token:cashier,body:{visitId:VISIT,patientId:PATIENT,items:[{name:'床位费',cents:3000}],operatorNote:'中途结算'}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.type).toBe('mid');
    expect(r.data.settleNo).toMatch(/^MID-/);
  });
  it('items 空 → 400', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/mid-settlements',{token:cashier,body:{visitId:VISIT,patientId:PATIENT,items:[]}});
    expect(r.httpStatus).toBe(400); expect(r.code).toBe(40000);
  });
  it('行级错配 patientId → 403', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/mid-settlements',{token:cashier,body:{visitId:VISIT,patientId:'PT-WRONG',items:[{name:'x',cents:100}]}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
});

describe('P0-5 一日清单推送', () => {
  it('doctor 推送 → 403', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/daily-statements/push',{token:doctor,body:{visitId:VISIT,patientId:PATIENT}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('cashier 推送 → 200 字段齐全', async () => {
    const r = await call('POST','/api/v1/inpatient/deposit-settle/daily-statements/push',{token:cashier,body:{visitId:VISIT,patientId:PATIENT,statementDate:'2026-11-04'}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.statementNo).toMatch(/^DS-/);
    expect(typeof r.data.totalCents).toBe('number');
    expect(typeof r.data.depositBalanceCents).toBe('number');
    expect(Array.isArray(r.data.items)).toBe(true);
    expect(typeof r.data.pushedAt).toBe('number');
  });
  it('同日重复推送 → 同一 statementNo（幂等）', async () => {
    const b = {visitId:VISIT,patientId:PATIENT,statementDate:'2026-11-04'};
    const r1 = await call('POST','/api/v1/inpatient/deposit-settle/daily-statements/push',{token:cashier,body:b});
    const r2 = await call('POST','/api/v1/inpatient/deposit-settle/daily-statements/push',{token:cashier,body:b});
    expect(r1.data.statementNo).toBe(r2.data.statementNo);
  });
});
