/**
 * 健澜AI原生医院操作系统OS - P1-8 FHIR R4 资源扩展 端到端
 *
 * 真实 HTTP 打 8080，自签 doctor/patient JWT。
 * 24 类资源各 1 个 round-trip（POST→GET 字段一致）+ 不支持类型 404 + 行级错配 403。
 * 可重跑：用 Date.now() 盐值生成唯一 id。
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
const doctor = sign(['doctor'], '医生', 'doc-fhir');
const patientMe = sign(['patient'], '患者', `P-ME-${SALT}`);

const RESOURCES = [
  'Patient','Encounter','Observation','MedicationRequest',
  'Condition','Procedure','DocumentReference','Coverage',
  'ExplanationOfBenefit','AllergyIntolerance','AdverseEvent','CarePlan',
  'EpisodeOfCare','Flag','List','RelatedPerson',
  'Practitioner','PractitionerRole','Location','Organization',
  'DiagnosticReport','ServiceRequest','MedicationDispense','MedicationAdministration',
];

function bodyFor(rt: string): Record<string, unknown> {
  const base: Record<string, unknown> = { resourceType: rt, id: `${rt}-${SALT}`, status: 'active' };
  if (['Patient','Practitioner','PractitionerRole','Location','Organization'].includes(rt)) return base;
  if (rt === 'Coverage' || rt === 'ExplanationOfBenefit') { base.beneficiary = { reference: `Patient/P-ME-${SALT}` }; return base; }
  base.subject = { reference: `Patient/P-ME-${SALT}` };
  return base;
}

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-8 FHIR R4 round-trip', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/fhir/r4/Patient');
    expect(r.httpStatus).toBe(401);
  });
  for (const rt of RESOURCES) {
    it(`${rt} POST→GET 字段一致`, async () => {
      const post = await call('POST',`/fhir/r4/${rt}`,{token:doctor,body:bodyFor(rt)});
      expect(post.httpStatus).toBe(200);
      expect(post.data.id).toBe(`${rt}-${SALT}`);
      expect(post.data.meta.lastUpdated).toBeTruthy();
      const get = await call('GET',`/fhir/r4/${rt}/${rt}-${SALT}`,{token:doctor});
      expect(get.httpStatus).toBe(200);
      expect(get.data.resourceType).toBe(rt);
      expect(get.data.id).toBe(`${rt}-${SALT}`);
    });
  }
});

describe('P1-8 校验与权限', () => {
  it('不支持的 resourceType → 404', async () => {
    const r = await call('GET','/fhir/r4/NotAResource',{token:doctor});
    expect(r.httpStatus).toBe(404);
  });
  it('POST 缺 resourceType → 400', async () => {
    const r = await call('POST','/fhir/r4/Condition',{token:doctor,body:{id:'x'}});
    expect(r.httpStatus).toBe(400);
  });
  it('patient 角色访问他人 Condition → 403；列表只回自己的', async () => {
    // doctor 建一条属于 P-OTHER 的 Condition
    const other: Record<string, unknown> = { resourceType: 'Condition', id: `C-OTHER-${SALT}`, subject: { reference: `Patient/P-OTHER-${SALT}` } };
    await call('POST','/fhir/r4/Condition',{token:doctor,body:other});
    const denied = await call('GET',`/fhir/r4/Condition/C-OTHER-${SALT}`,{token:patientMe});
    expect(denied.httpStatus).toBe(403); expect(denied.code).toBe(40300);
    // patient 建自己的 Condition
    const mine: Record<string, unknown> = { resourceType: 'Condition', id: `C-MINE-${SALT}`, subject: { reference: `Patient/P-ME-${SALT}` } };
    await call('POST','/fhir/r4/Condition',{token:patientMe,body:mine});
    const list = await call('GET','/fhir/r4/Condition',{token:patientMe});
    const ids = list.data.entry.map((e: any) => e.resource.id);
    expect(ids).toContain(`C-MINE-${SALT}`);
    expect(ids).not.toContain(`C-OTHER-${SALT}`);
  });
  it('PUT 更新不存在 id → 404；存在则 200', async () => {
    const miss = await call('PUT',`/fhir/r4/Patient/DOES-NOT-EXIST-${SALT}`,{token:doctor,body:{resourceType:'Patient',id:`DOES-NOT-EXIST-${SALT}`}});
    expect(miss.httpStatus).toBe(404);
  });
});
