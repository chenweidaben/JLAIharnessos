/**
 * 健澜AI原生医院操作系统OS - P1-5 ICU 监护文书 端到端
 *
 * 真实 HTTP 打 8080，自签 icu_doctor/icu_nurse JWT。
 * 可重跑：每次运行用 Date.now() 盐值生成唯一 visitId。
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

const doc = sign(['icu_doctor'],'ICU医生','doc-p15');
const nurse = sign(['icu_nurse'],'ICU护士','nur-p15');
const SALT = Date.now().toString(36);
const VID = `V-ICU-${SALT}`;
const PID = 'PT-P001';

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-5 转入转出', () => {
  it('无 token → 401', async () => {
    const r = await call('POST','/api/v1/icu/notes/admission',{body:{visitId:'V',patientId:'P'}});
    expect(r.httpStatus).toBe(401);
  });
  it('icu_doctor 转入 → admitted；重复转入 → 409；nurse 转入 → 403', async () => {
    const a = await call('POST','/api/v1/icu/notes/admission',{token:doc,body:{visitId:VID,patientId:PID,reason:'呼衰',acuityLevel:3,plannedVentHours:24}});
    expect(a.httpStatus).toBe(200); expect(a.data.status).toBe('admitted');
    const dup = await call('POST','/api/v1/icu/notes/admission',{token:doc,body:{visitId:VID,patientId:PID,reason:'x',acuityLevel:2,plannedVentHours:0}});
    expect(dup.httpStatus).toBe(409);
    const denied = await call('POST','/api/v1/icu/notes/admission',{token:nurse,body:{visitId:VID+'-X',patientId:PID,reason:'x',acuityLevel:2,plannedVentHours:0}});
    expect(denied.httpStatus).toBe(403); expect(denied.code).toBe(40300);
  });
  it('未转入 visitId 转出 → 409', async () => {
    const r = await call('POST','/api/v1/icu/notes/discharge',{token:doc,body:{visitId:VID+'-NO',patientId:PID,disposition:'ward'}});
    expect(r.httpStatus).toBe(409);
  });
});

describe('P1-5 多时间点体征', () => {
  it('icu_nurse 录体征 → 200；HR 越界 → 400；同时间点重复 → 409；doctor 录 → 403', async () => {
    const ok = await call('POST',`/api/v1/icu/notes/${VID}/vitals`,{token:nurse,body:{patientId:PID,recordedAt:1000,heartRate:80,sbp:120,dbp:75,respRate:16,spo2:98,temperatureC:37,gcsScore:15,urineOutputMl:100}});
    expect(ok.httpStatus).toBe(200);
    const bad = await call('POST',`/api/v1/icu/notes/${VID}/vitals`,{token:nurse,body:{patientId:PID,recordedAt:2000,heartRate:999,sbp:120,dbp:75,respRate:16,spo2:98,temperatureC:37,gcsScore:15,urineOutputMl:100}});
    expect(bad.httpStatus).toBe(400);
    const dup = await call('POST',`/api/v1/icu/notes/${VID}/vitals`,{token:nurse,body:{patientId:PID,recordedAt:1000,heartRate:81,sbp:120,dbp:75,respRate:16,spo2:98,temperatureC:37,gcsScore:15,urineOutputMl:100}});
    expect(dup.httpStatus).toBe(409);
    const denied = await call('POST',`/api/v1/icu/notes/${VID}/vitals`,{token:doc,body:{patientId:PID,recordedAt:3000,heartRate:80,sbp:120,dbp:75,respRate:16,spo2:98,temperatureC:37,gcsScore:15,urineOutputMl:100}});
    expect(denied.httpStatus).toBe(403);
  });
  it('再录一个时间点并 GET 列表按 recordedAt 升序', async () => {
    await call('POST',`/api/v1/icu/notes/${VID}/vitals`,{token:nurse,body:{patientId:PID,recordedAt:1500,heartRate:85,sbp:118,dbp:72,respRate:17,spo2:97,temperatureC:37.2,gcsScore:15,urineOutputMl:120}});
    const r = await call('GET',`/api/v1/icu/notes/${VID}/vitals`,{token:doc});
    expect(r.httpStatus).toBe(200);
    const times = (r.data as Array<{recordedAt:number}>).map((v) => v.recordedAt);
    expect(times).toEqual([1000, 1500]);
  });
});

describe('P1-5 评分引擎', () => {
  it('APACHE II 重病向量 → 28；SOFA 全 1 → 6；RASS=6 → 400；nurse 评分 → 403', async () => {
    const ap = await call('POST',`/api/v1/icu/notes/${VID}/scores`,{token:doc,body:{patientId:PID,scoreType:'apache2',recordedAt:5000,items:{age:78,temperatureC:39.5,map:55,heartRate:130,respRate:35,gcsScore:8,chronicPoints:5}}});
    expect(ap.httpStatus).toBe(200); expect(ap.data.totalScore).toBe(28);
    const sf = await call('POST',`/api/v1/icu/notes/${VID}/scores`,{token:doc,body:{patientId:PID,scoreType:'sofa',recordedAt:5000,items:{respiratory:1,coagulation:1,liver:1,cardiovascular:1,cns:1,renal:1}}});
    expect(sf.data.totalScore).toBe(6);
    const r = await call('POST',`/api/v1/icu/notes/${VID}/scores`,{token:doc,body:{patientId:PID,scoreType:'rass',recordedAt:5000,items:{value:6}}});
    expect(r.httpStatus).toBe(400);
    const denied = await call('POST',`/api/v1/icu/notes/${VID}/scores`,{token:nurse,body:{patientId:PID,scoreType:'sofa',recordedAt:6000,items:{}}});
    expect(denied.httpStatus).toBe(403); expect(denied.code).toBe(40300);
  });
  it('同 scoreType 同 recordedAt 重复评分 → 409', async () => {
    const r = await call('POST',`/api/v1/icu/notes/${VID}/scores`,{token:doc,body:{patientId:PID,scoreType:'ramsay',recordedAt:7000,items:{value:4}}});
    expect(r.httpStatus).toBe(200);
    const dup = await call('POST',`/api/v1/icu/notes/${VID}/scores`,{token:doc,body:{patientId:PID,scoreType:'ramsay',recordedAt:7000,items:{value:5}}});
    expect(dup.httpStatus).toBe(409);
  });
  it('转出 → discharged；GET 评分列表', async () => {
    const d = await call('POST','/api/v1/icu/notes/discharge',{token:doc,body:{visitId:VID,patientId:PID,disposition:'ward'}});
    expect(d.httpStatus).toBe(200); expect(d.data.status).toBe('discharged');
    const s = await call('GET',`/api/v1/icu/notes/${VID}/scores`,{token:doc});
    expect(s.httpStatus).toBe(200);
    expect((s.data as unknown[]).length).toBeGreaterThanOrEqual(2);
  });
});
