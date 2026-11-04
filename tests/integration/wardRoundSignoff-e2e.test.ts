/**
 * 健澜AI原生医院操作系统OS - P1-1 三级检诊工作流 端到端
 *
 * 真实 HTTP 打 8080。自签 resident/attending/chief JWT。覆盖：
 * 无 token 401、resident 写病程 200(draft)、attending approve→chief_sign、chief 终签→archived、
 * resident 终签 403(40300)、resident 审 403、越级直签 escalated/bypassedLevel=attending、
 * reject 回 draft、trail 时间线、行级错配 403。可重跑。
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

const resident = signToken(['resident'],'住院医',"res-p11");
const attending = signToken(['attending'],'主治','att-p11');
const chief = signToken(['chief'],'主任','chf-p11');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-1 鉴权', () => {
  it('无 token 写病程 → 401', async () => {
    const r = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{body:{visitId:'V-E2E',patientId:'PT-E2E',content:'x'}});
    expect(r.httpStatus).toBe(401);
  });
});

describe('P1-1 正常三级流转', () => {
  it('resident 写病程 → 200 draft', async () => {
    const r = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-NORM',patientId:'PT-P001',content:'患者病情稳定'}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('draft');
  });
  it('resident 主治审 → 403 code=40300', async () => {
    const note = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-PERM',patientId:'PT-P001',content:'x'}});
    const r = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/review`,{token:resident,body:{action:'approve'}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('resident 主任终签 → 403 code=40300', async () => {
    const note = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-PERM2',patientId:'PT-P001',content:'x'}});
    const r = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/chief-sign`,{token:resident,body:{}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('attending approve → chief_sign；chief 终签 → archived', async () => {
    const note = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-FLOW',patientId:'PT-P001',content:'查体见稳定'}});
    const rv = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/review`,{token:attending,body:{action:'approve',comment:'同意'}});
    expect(rv.data.status).toBe('chief_sign');
    const cs = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/chief-sign`,{token:chief,body:{comment:'同意终签'}});
    expect(cs.data.status).toBe('archived');
    expect(cs.data.escalated).toBe(false);
  });
});

describe('P1-1 越级与意见', () => {
  it('主治未审、主任直签 → 200 且 escalated=true bypassedLevel=attending', async () => {
    const note = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-ESC',patientId:'PT-P001',content:'急查需主任判定'}});
    const cs = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/chief-sign`,{token:chief,body:{}});
    expect(cs.httpStatus).toBe(200);
    expect(cs.data.escalated).toBe(true);
    expect(cs.data.bypassedLevel).toBe('attending');
  });
  it('attending reject → 回 draft 且 trail 留 reject 意见', async () => {
    const note = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-REJ',patientId:'PT-P001',content:'待补充'}});
    const rv = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/review`,{token:attending,body:{action:'reject',comment:'补充影像结果'}});
    expect(rv.data.status).toBe('draft');
    const trail = await call('GET',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/trail`,{token:resident});
    expect(trail.httpStatus).toBe(200);
    const rej = trail.data.find((x:any)=>x.action==='reject');
    expect(rej.comment).toBe('补充影像结果');
    expect(rej.reviewerRole).toBe('attending');
  });
  it('行级错配 patientId → 403', async () => {
    const note = await call('POST','/api/v1/inpatient/ward-round-signoff/notes',{token:resident,body:{visitId:'V-BIND',patientId:'PT-P001',content:'x'}});
    const r = await call('POST',`/api/v1/inpatient/ward-round-signoff/notes/${note.data.noteId}/review`,{token:attending,body:{action:'approve',patientId:'PT-WRONG'}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
});
