/**
 * 健澜AI原生医院操作系统OS - P0-6 临床电子签名端到端
 *
 * 真实 HTTP 打 8080。自签 doctor/nurse JWT。覆盖：
 * 无 token 401、doctor 签 emr 200（含 sm3Digest/tsa）、nurse 签 nursing-record 200、
 * doctor 签 nursing-record 403(code=40300)、验签原文 valid=true、篡改 400 valid=false、
 * GET 列表 200。可重跑（同 objectId 幂等返回原签名）。
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

const doctor = signToken(['doctor'],'医生陈','doc-p06');
const nurse = signToken(['nurse'],'护士林','nur-p06');
const EMR_ID = 'E2E-EMR-001';
const NR_ID = 'E2E-NR-001';
const EMR_CONTENT = '患者王某某，男，58岁，2型糖尿病，血糖控制良好。';
const NR_CONTENT = '护理交班：夜间巡视平稳，生命体征正常。';

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P0-6 鉴权', () => {
  it('无 token 签名 → 401', async () => {
    const r = await call('POST','/api/v1/e-sign/clinical/objects',{body:{objectType:'emr',objectId:EMR_ID,content:EMR_CONTENT}});
    expect(r.httpStatus).toBe(401);
  });
});

describe('P0-6 签名', () => {
  it('doctor 签 emr → 200，返回 sm3Digest/signature/tsaToken', async () => {
    const r = await call('POST','/api/v1/e-sign/clinical/objects',{token:doctor,body:{objectType:'emr',objectId:EMR_ID,content:EMR_CONTENT}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.signId).toMatch(/^CSIG-/);
    expect(r.data.sm3Digest.length).toBe(64);
    expect(typeof r.data.signature).toBe('string');
    expect(r.data.signature.length).toBeGreaterThan(20);
    expect(r.data.tsaCertId).toBe('MOCK-TSA-SM2-CERT-0001');
    expect(r.data.prevHash).not.toBeUndefined();
  });
  it('nurse 签 nursing-record → 200', async () => {
    const r = await call('POST','/api/v1/e-sign/clinical/objects',{token:nurse,body:{objectType:'nursing-record',objectId:NR_ID,content:NR_CONTENT}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.objectType).toBe('nursing-record');
  });
  it('doctor 签 nursing-record → 403 code=40300', async () => {
    const r = await call('POST','/api/v1/e-sign/clinical/objects',{token:doctor,body:{objectType:'nursing-record',objectId:'NR-FORBID',content:'x'}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
});

describe('P0-6 验签', () => {
  it('原文验签 → 200 valid=true', async () => {
    const sign = await call('POST','/api/v1/e-sign/clinical/objects',{token:doctor,body:{objectType:'emr',objectId:EMR_ID,content:EMR_CONTENT}});
    const r = await call('POST',`/api/v1/e-sign/clinical/objects/${sign.data.signId}/verify`,{token:doctor,body:{content:EMR_CONTENT}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.valid).toBe(true);
  });
  it('篡改内容验签 → 400 valid=false', async () => {
    const sign = await call('POST','/api/v1/e-sign/clinical/objects',{token:doctor,body:{objectType:'emr',objectId:EMR_ID,content:EMR_CONTENT}});
    const r = await call('POST',`/api/v1/e-sign/clinical/objects/${sign.data.signId}/verify`,{token:doctor,body:{content:EMR_CONTENT+'篡改'}});
    expect(r.httpStatus).toBe(400);
    expect(r.data?.valid ?? false).toBe(false);
  });
});

describe('P0-6 列表', () => {
  it('GET 签名列表 → 200 数组', async () => {
    await call('POST','/api/v1/e-sign/clinical/objects',{token:doctor,body:{objectType:'emr',objectId:EMR_ID,content:EMR_CONTENT}});
    const r = await call('GET',`/api/v1/e-sign/clinical/objects/emr/${EMR_ID}`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(1);
  });
});
