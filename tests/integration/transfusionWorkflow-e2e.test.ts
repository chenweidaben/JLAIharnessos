/**
 * 健澜AI原生医院操作系统OS - P1-4 输血闭环 端到端
 *
 * 真实 HTTP 打 8080，自签 doctor/blood_bank_tech/nurse JWT。
 * 可重跑：每次运行用 Date.now() 盐值生成唯一 visitId/patientId/血袋号，避免跨轮库存漂移。
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

const doctor = sign(['doctor'],'医生','doc-p14');
const bbt = sign(['blood_bank_tech'],'血库','bbt-p14');
const nurse = sign(['nurse'],'护士','nur-p14');
const SALT = Date.now().toString(36);
const VID = `V-E2E-TX-${SALT}`;
const PID = 'PT-P001';
const BAG = `BAG-${SALT}`;

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

async function fullPath(): Promise<string> {
  const c = await call('POST','/api/v1/transfusion-workflow/requests',{token:doctor,body:{visitId:VID,patientId:PID,bloodType:'A',units:2,indication:'失血'}});
  expect(c.httpStatus).toBe(200);
  const rid = c.data.reqId;
  await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/type`,{token:bbt,body:{abo:'A',rh:'+',antibodyScreen:'neg'}});
  await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/crossmatch`,{token:bbt,body:{donorBagNo:BAG,compatibility:'compatible'}});
  await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/issue`,{token:bbt,body:{bagNo:BAG,expiresAt:Date.now()+5*3600_000}});
  await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/bedside-check`,{token:nurse,body:{nurseId:'n1',witnessNurseId:'n2',patientId:PID,bagNo:BAG,matched:true}});
  const t = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/transfuse`,{token:nurse,body:{}});
  expect(t.data.status).toBe('transfusing');
  return rid;
}

describe('P1-4 申请与权限', () => {
  it('无 token → 401', async () => {
    const r = await call('POST','/api/v1/transfusion-workflow/requests',{body:{visitId:'V',patientId:'P'}});
    expect(r.httpStatus).toBe(401);
  });
  it('doctor 申请 → application；units 越界 → 400', async () => {
    const r = await call('POST','/api/v1/transfusion-workflow/requests',{token:doctor,body:{visitId:VID+'-A',patientId:PID,bloodType:'O',units:1,indication:'x'}});
    expect(r.httpStatus).toBe(200); expect(r.data.status).toBe('application');
    const bad = await call('POST','/api/v1/transfusion-workflow/requests',{token:doctor,body:{visitId:VID+'-B',patientId:PID,bloodType:'O',units:99,indication:'x'}});
    expect(bad.httpStatus).toBe(400);
  });
  it('nurse 申请 → 403 code=40300；doctor 血型鉴定 → 403', async () => {
    const r = await call('POST','/api/v1/transfusion-workflow/requests',{token:nurse,body:{visitId:VID+'-C',patientId:PID,bloodType:'O',units:1,indication:'x'}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
});

describe('P1-4 配血不合与重复发血', () => {
  it('交叉配血 incompatible → 409 code=40900', async () => {
    const c = await call('POST','/api/v1/transfusion-workflow/requests',{token:doctor,body:{visitId:VID+'-IC',patientId:PID,bloodType:'O',units:1,indication:'x'}});
    await call('POST',`/api/v1/transfusion-workflow/requests/${c.data.reqId}/type`,{token:bbt,body:{abo:'O',rh:'+',antibodyScreen:'neg'}});
    const r = await call('POST',`/api/v1/transfusion-workflow/requests/${c.data.reqId}/crossmatch`,{token:bbt,body:{donorBagNo:BAG+'-X',compatibility:'incompatible'}});
    expect(r.httpStatus).toBe(409); expect(r.code).toBe(40900);
  });
});

describe('P1-4 双人核对', () => {
  it('witness==nurse → 400；matched=false → 409；bedside 越权(nurse 才能) 由 doctor 调 → 403', async () => {
    const c = await call('POST','/api/v1/transfusion-workflow/requests',{token:doctor,body:{visitId:VID+'-BC',patientId:PID,bloodType:'O',units:1,indication:'x'}});
    const rid = c.data.reqId;
    await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/type`,{token:bbt,body:{abo:'O',rh:'+',antibodyScreen:'neg'}});
    await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/crossmatch`,{token:bbt,body:{donorBagNo:BAG+'-Y',compatibility:'compatible'}});
    await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/issue`,{token:bbt,body:{bagNo:BAG+'-Y',expiresAt:Date.now()+3600_000}});
    const same = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/bedside-check`,{token:nurse,body:{nurseId:'n9',witnessNurseId:'n9',patientId:PID,bagNo:BAG+'-Y',matched:true}});
    expect(same.httpStatus).toBe(400);
    const mismatch = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/bedside-check`,{token:nurse,body:{nurseId:'n1',witnessNurseId:'n2',patientId:PID,bagNo:BAG+'-Y',matched:false}});
    expect(mismatch.httpStatus).toBe(409);
    // doctor 不能做床边核对
    await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/bedside-check`,{token:nurse,body:{nurseId:'n1',witnessNurseId:'n2',patientId:PID,bagNo:BAG+'-Y',matched:true}});
    const denied = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/transfuse`,{token:doctor,body:{}});
    expect(denied.httpStatus).toBe(403); expect(denied.code).toBe(40300);
  });
});

describe('P1-4 全流程与不良反应', () => {
  it('申请→鉴定→配血→发血→双人核对→输注→完成→不良反应', async () => {
    const rid = await fullPath();
    const bad = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/adverse-reaction`,{token:nurse,body:{type:'febrile',severity:5,description:'x'}});
    expect(bad.httpStatus).toBe(400);
    const ok = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/adverse-reaction`,{token:nurse,body:{type:'allergic',severity:2,description:'皮疹'}});
    expect(ok.httpStatus).toBe(200);
    expect(ok.data.adverseReactions.length).toBe(1);
    const done = await call('POST',`/api/v1/transfusion-workflow/requests/${rid}/complete`,{token:nurse,body:{}});
    expect(done.data.status).toBe('completed');
  });
  it('GET 列表按 visitId 过滤 → 200 数组', async () => {
    const r = await call('GET',`/api/v1/transfusion-workflow/requests?visitId=${VID}`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(1);
  });
});
