/**
 * 健澜AI原生医院操作系统OS - P2-2 CDS 规则引擎 端到端
 *
 * 真实 HTTP 打 8080，自签 doctor/nurse JWT。
 * 可重跑：用 Date.now() 盐值生成唯一 visitId。
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
const VID = `V-CDS-${SALT}`;
const doctor = sign(['doctor'], '医生', 'doc-cds');
const nurse = sign(['nurse'], '护士', 'nurse-cds');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P2-2 CDS medication 预审', () => {
  it('无 token → 401', async () => {
    const r = await call('POST','/api/v1/cds/checks/medication',{body:{drugCode:'x'}});
    expect(r.httpStatus).toBe(401);
  });
  it('nurse 预审 → 403', async () => {
    const r = await call('POST','/api/v1/cds/checks/medication',{token:nurse,body:{drugCode:'paracetamol',dose:500,route:'po',durationDays:3,patientAge:50}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('hard-stop（paracetamol 5g）→ 409 code=40900', async () => {
    const r = await call('POST','/api/v1/cds/checks/medication',{token:doctor,body:{visitId:VID,patientId:'P',drugCode:'paracetamol',dose:5000,route:'po',durationDays:3,patientAge:50}});
    expect(r.httpStatus).toBe(409); expect(r.code).toBe(40900);
    expect(r.data.level).toBe('hard-stop');
  });
  it('warning（warfarin+ibuprofen）未 force → 200 提示；force+overrideReason → 200', async () => {
    const w = await call('POST','/api/v1/cds/checks/medication',{token:doctor,body:{visitId:VID,patientId:'P',drugCode:'warfarin',dose:5,route:'po',durationDays:3,patientAge:50,concurrentDrugs:['ibuprofen']}});
    expect(w.httpStatus).toBe(200); expect(w.data.level).toBe('warning');
    const forced = await call('POST','/api/v1/cds/checks/medication',{token:doctor,body:{visitId:VID,patientId:'P',drugCode:'warfarin',dose:5,route:'po',durationDays:3,patientAge:50,concurrentDrugs:['ibuprofen'],force:true,overrideReason:'患者已知情出血风险'}});
    expect(forced.httpStatus).toBe(200);
  });
  it('force 但无 overrideReason → 400', async () => {
    const r = await call('POST','/api/v1/cds/checks/medication',{token:doctor,body:{visitId:VID,patientId:'P',drugCode:'warfarin',dose:5,route:'po',durationDays:3,patientAge:50,concurrentDrugs:['ibuprofen'],force:true}});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P2-2 危急值联动', () => {
  it('血钾 2.5 → 自动建 alert；acknowledge 闭环', async () => {
    const a = await call('POST','/api/v1/cds/checks/lab-critical',{token:doctor,body:{visitId:VID,patientId:'P',labCode:'K',value:2.5,unit:'mmol/L'}});
    expect(a.data.triggered).toBe(true);
    const alertId = a.data.alert.alertId;
    const ack = await call('POST',`/api/v1/cds/checks/alerts/${alertId}/acknowledge`,{token:doctor,body:{note:'已补钾'}});
    expect(ack.data.status).toBe('acknowledged');
    const list = await call('GET',`/api/v1/cds/checks/alerts?visitId=${VID}`,{token:doctor});
    expect(list.data.length).toBeGreaterThan(0);
  });
  it('血钾 4.0 → 不触发', async () => {
    const a = await call('POST','/api/v1/cds/checks/lab-critical',{token:doctor,body:{visitId:VID,patientId:'P',labCode:'K',value:4.0,unit:'mmol/L'}});
    expect(a.data.triggered).toBe(false);
  });
});
