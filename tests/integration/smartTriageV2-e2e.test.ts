/**
 * 健澜AI原生医院操作系统OS - P3-2 智能预问诊+智慧导诊 端到端
 *
 * 真实 HTTP 打 8080，自签 patient/doctor JWT。
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
const PID = `P-ST-${SALT}`;
const OTHER = `P-OTHER-${SALT}`;
const patientSelf = sign(['patient'], '患者本人', PID);
const patientOther = sign(['patient'], '另一患者', OTHER);
const doctor = sign(['doctor'], '医生', 'doc-st');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P3-2 预问诊问卷', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/api/v1/smart-triage/symptoms');
    expect(r.httpStatus).toBe(401);
  });
  it('patient 创建 draft 问卷', async () => {
    const r = await call('POST','/api/v1/smart-triage/questionnaires',{token:patientSelf,body:{
      patientId:PID, chiefComplaint:'胸痛 1 天', presentIllness:'活动后压榨样',
      pastHistory:['高血压'], allergyHistory:['青霉素'], currentMeds:['氨氯地平'],
      symptomTags:['chest-pain'], durationDays:1, severity:'moderate',
    }});
    expect(r.httpStatus).toBe(200); expect(r.data.status).toBe('draft');
  });
  it('doctor 创建问卷 → 403', async () => {
    const r = await call('POST','/api/v1/smart-triage/questionnaires',{token:doctor,body:{
      patientId:PID, chiefComplaint:'x', presentIllness:'', symptomTags:['fever'], durationDays:1, severity:'mild',
    }});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('patient 看别人问卷列表 → 403', async () => {
    const r = await call('GET',`/api/v1/smart-triage/questionnaires?patientId=${OTHER}`,{token:patientSelf});
    expect(r.httpStatus).toBe(403);
  });
  it('submit 生成 aiSummary；重复 submit 409；review 流转', async () => {
    const c = await call('POST','/api/v1/smart-triage/questionnaires',{token:patientSelf,body:{
      patientId:PID, chiefComplaint:'头痛 3 天', presentIllness:'搏动样头痛',
      symptomTags:['headache'], durationDays:3, severity:'mild',
    }});
    const id = c.data.questionnaireId;
    const s = await call('POST',`/api/v1/smart-triage/questionnaires/${id}/submit`,{token:patientSelf});
    expect(s.httpStatus).toBe(200);
    expect(s.data.aiSummary).toContain('主诉：头痛 3 天');
    const dup = await call('POST',`/api/v1/smart-triage/questionnaires/${id}/submit`,{token:patientSelf});
    expect(dup.httpStatus).toBe(409);
    const rev = await call('POST',`/api/v1/smart-triage/questionnaires/${id}/review`,{token:doctor});
    expect(rev.data.status).toBe('reviewed-by-doctor');
  });
  it('review 未 submit 问卷 → 409', async () => {
    const c = await call('POST','/api/v1/smart-triage/questionnaires',{token:patientSelf,body:{
      patientId:PID, chiefComplaint:'x', presentIllness:'', symptomTags:['fever'], durationDays:1, severity:'mild',
    }});
    const id = c.data.questionnaireId;
    const r = await call('POST',`/api/v1/smart-triage/questionnaires/${id}/review`,{token:doctor});
    expect(r.httpStatus).toBe(409);
  });
  it('symptomTags 空 → 400', async () => {
    const r = await call('POST','/api/v1/smart-triage/questionnaires',{token:patientSelf,body:{
      patientId:PID, chiefComplaint:'x', presentIllness:'', symptomTags:[], durationDays:1, severity:'mild',
    }});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P3-2 智慧导诊', () => {
  it('symptoms 字典 >=15 条', async () => {
    const r = await call('GET','/api/v1/smart-triage/symptoms',{token:patientSelf});
    expect(r.httpStatus).toBe(200);
    expect(r.data.length).toBeGreaterThanOrEqual(15);
  });
  it('chest-pain → emergency=true 且首推急诊科', async () => {
    const r = await call('POST','/api/v1/smart-triage/triage',{token:patientSelf,body:{patientId:PID,symptomTags:['chest-pain']}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.emergency).toBe(true);
    expect(r.data.recommendedDepartments[0].departmentId).toBe('emergency');
  });
  it('cough → respiratory 非急诊', async () => {
    const r = await call('POST','/api/v1/smart-triage/triage',{token:patientSelf,body:{patientId:PID,symptomTags:['cough']}});
    expect(r.data.emergency).toBe(false);
    expect(r.data.recommendedDepartments[0].departmentId).toBe('respiratory');
  });
  it('多症状聚合 top3（headache+dizziness 同 neurology 加分）', async () => {
    const r = await call('POST','/api/v1/smart-triage/triage',{token:patientSelf,body:{patientId:PID,symptomTags:['headache','dizziness']}});
    const neu = r.data.recommendedDepartments.find((d:any)=>d.departmentId==='neurology');
    expect(neu.score).toBe(2);
  });
  it('无匹配 → 全科兜底', async () => {
    const r = await call('POST','/api/v1/smart-triage/triage',{token:patientSelf,body:{patientId:PID,symptomTags:['weird-tag']}});
    expect(r.data.recommendedDepartments[0].departmentId).toBe('general');
  });
  it('symptomTags 空数组 → 400', async () => {
    const r = await call('POST','/api/v1/smart-triage/triage',{token:patientSelf,body:{patientId:PID,symptomTags:[]}});
    expect(r.httpStatus).toBe(400);
  });
});
