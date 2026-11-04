/**
 * 健澜AI原生医院操作系统OS - P1-6 院前住院管家 端到端
 *
 * 真实 HTTP 打 8080，自签 patient/family/nurse JWT。
 * 可重跑：每次运行用 Date.now() 盐值生成唯一 patientId/familyMemberId。
 * 注意：patient JWT 的 sub 必须等于 patientId（后端按 actor.id===patientId 鉴本人）。
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

const SALT = Date.now().toString(36);
const PID = `P-CON-${SALT}`;
const FAM = `FAM-${SALT}`;
const patient = sign(['patient'], '患者', PID);
const family = sign(['family'], '家属', FAM);
const nurse = sign(['nurse'], '护士', 'nurse-p16');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-6 预入院与报到', () => {
  it('无 token → 401', async () => {
    const r = await call('POST','/api/v1/inpatient-concierge/pre-admission',{body:{patientId:'P'}});
    expect(r.httpStatus).toBe(401);
  });
  it('patient 本人预入院 → pre-admitted + 10 条清单；nurse 报到 → checked-in；重复报到 409', async () => {
    const c = await call('POST','/api/v1/inpatient-concierge/pre-admission',{token:patient,body:{patientId:PID,scheduledAdmissionAt:Date.now()+24*3600_000,department:'消化内科',expectedStayDays:5}});
    expect(c.httpStatus).toBe(200); expect(c.data.status).toBe('pre-admitted');
    const paId = c.data.preAdmissionId;
    const cl = await call('GET',`/api/v1/inpatient-concierge/${paId}/checklist`,{token:patient});
    expect(cl.data.length).toBe(10);
    const ci = await call('POST',`/api/v1/inpatient-concierge/${paId}/check-in`,{token:nurse,body:{}});
    expect(ci.httpStatus).toBe(200); expect(ci.data.status).toBe('checked-in');
    const dup = await call('POST',`/api/v1/inpatient-concierge/${paId}/check-in`,{token:nurse,body:{}});
    expect(dup.httpStatus).toBe(409);
  });
  it('patient 给别人预入院 → 403 code=40300', async () => {
    const r = await call('POST','/api/v1/inpatient-concierge/pre-admission',{token:patient,body:{patientId:'P-SOMEONE-ELSE',scheduledAdmissionAt:Date.now(),department:'x',expectedStayDays:1}});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
});

describe('P1-6 准备清单 toggle', () => {
  it('toggle 第一条 → done；再 toggle 同 state 幂等', async () => {
    const c = await call('POST','/api/v1/inpatient-concierge/pre-admission',{token:patient,body:{patientId:PID,scheduledAdmissionAt:Date.now()+24*3600_000,department:'x',expectedStayDays:1}});
    const paId = c.data.preAdmissionId;
    const cl = await call('GET',`/api/v1/inpatient-concierge/${paId}/checklist`,{token:patient});
    const itemId = cl.data[0].itemId;
    const t = await call('POST',`/api/v1/inpatient-concierge/${paId}/checklist/${itemId}/toggle`,{token:patient,body:{state:'done'}});
    expect(t.httpStatus).toBe(200); expect(t.data.state).toBe('done');
    const again = await call('POST',`/api/v1/inpatient-concierge/${paId}/checklist/${itemId}/toggle`,{token:patient,body:{state:'done'}});
    expect(again.data.state).toBe('done');
  });
});

describe('P1-6 检查检验预约', () => {
  it('slots 返回 8 时段；book 合法 → 200；重复同 patient+exam+slot → 409；非法时段 → 400', async () => {
    const c = await call('POST','/api/v1/inpatient-concierge/pre-admission',{token:patient,body:{patientId:PID,scheduledAdmissionAt:Date.now()+24*3600_000,department:'x',expectedStayDays:1}});
    const paId = c.data.preAdmissionId;
    const slots = await call('POST',`/api/v1/inpatient-concierge/${paId}/lab-radiology/slots`,{token:patient,body:{examType:'ct'}});
    expect(slots.data.length).toBe(8);
    const book = await call('POST',`/api/v1/inpatient-concierge/${paId}/lab-radiology/book`,{token:patient,body:{examType:'ct',slotTime:slots.data[2],department:'放射科'}});
    expect(book.httpStatus).toBe(200);
    const dup = await call('POST',`/api/v1/inpatient-concierge/${paId}/lab-radiology/book`,{token:patient,body:{examType:'ct',slotTime:slots.data[2],department:'放射科'}});
    expect(dup.httpStatus).toBe(409);
    const bad = await call('POST',`/api/v1/inpatient-concierge/${paId}/lab-radiology/book`,{token:patient,body:{examType:'mri',slotTime:Date.now(),department:'x'}});
    expect(bad.httpStatus).toBe(400);
  });
});

describe('P1-6 家属授权链', () => {
  it('无授权家属 toggle → 403；patient 授权 scope=checklist 后家属 toggle → 200；家属推宣教（无 education scope）→ 403', async () => {
    const c = await call('POST','/api/v1/inpatient-concierge/pre-admission',{token:patient,body:{patientId:PID,scheduledAdmissionAt:Date.now()+24*3600_000,department:'x',expectedStayDays:1}});
    const paId = c.data.preAdmissionId;
    const cl = await call('GET',`/api/v1/inpatient-concierge/${paId}/checklist`,{token:patient});
    const itemId = cl.data[3].itemId;
    // 授权前：家属 toggle → 403
    const denied = await call('POST',`/api/v1/inpatient-concierge/${paId}/checklist/${itemId}/toggle`,{token:family,body:{state:'done'}});
    expect(denied.httpStatus).toBe(403); expect(denied.code).toBe(40300);
    // 患者授权
    const grant = await call('POST','/api/v1/inpatient-concierge/authorization',{token:patient,body:{patientId:PID,familyMemberId:FAM,familyMemberName:'家属甲',scope:['checklist']}});
    expect(grant.httpStatus).toBe(200);
    // 授权后：家属 toggle → 200
    const ok = await call('POST',`/api/v1/inpatient-concierge/${paId}/checklist/${itemId}/toggle`,{token:family,body:{state:'done'}});
    expect(ok.httpStatus).toBe(200); expect(ok.data.state).toBe('done');
    // 家属无 education scope 推宣教 → 403
    const eduDenied = await call('POST',`/api/v1/inpatient-concierge/${paId}/education`,{token:family,body:{topic:'x',content:'y',pushChannel:'app'}});
    expect(eduDenied.httpStatus).toBe(403);
    // nurse 推宣教 → 200
    const eduOk = await call('POST',`/api/v1/inpatient-concierge/${paId}/education`,{token:nurse,body:{topic:'呼吸锻炼',content:'缩唇呼吸',pushChannel:'app'}});
    expect(eduOk.httpStatus).toBe(200);
  });
});
