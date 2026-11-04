/**
 * 健澜AI原生医院操作系统OS - P5-3 EMPI + XDS E2E
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; raw?: string; }
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
  const txt = await res.text();
  let raw:any=null; try{raw=JSON.parse(txt);}catch{raw=null;}
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null, raw: txt };
}

const SALT = Date.now().toString(36);
const admin = sign(['admin'], '管理员', `admin-${SALT}`);
const doctor = sign(['doctor'], '医生', `doc-${SALT}`);
const patientRole = sign(['patient'], '患者', `pat-${SALT}`);
// 每轮唯一 idCard / name / phone，避免跨轮内存残留导致 match 错 master
const IDCARD = `11010119900101${String(1000 + Math.floor(Math.random()*9000))}`;
const UNIQ_NAME = `Zhang${SALT}`;
const UNIQ_PHONE = `139${SALT.padStart(8,'0').slice(-8)}`;

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('EMPI', () => {
  let masterId = '';
  it('建 3 条 link（同 master 跨 HIS/LIS/PACS）', async () => {
    const r = await call('POST','/api/v1/empi/links',{token:admin,body:{
      sourceSystem:'HIS', sourcePatientId:`H-${SALT}`,
      name:UNIQ_NAME, birthDate:'1990-01-01', gender:'M',
      idCard:IDCARD, phone:UNIQ_PHONE,
    }});
    expect(r.httpStatus).toBe(201);
    masterId = r.data.link.masterPatientId;
    expect(masterId).toBeTruthy();
    const r2 = await call('POST','/api/v1/empi/links',{token:admin,body:{masterPatientId:masterId,sourceSystem:'LIS',sourcePatientId:`L-${SALT}`}});
    const r3 = await call('POST','/api/v1/empi/links',{token:admin,body:{masterPatientId:masterId,sourceSystem:'PACS',sourcePatientId:`P-${SALT}`}});
    expect(r2.httpStatus).toBe(201);
    expect(r3.httpStatus).toBe(201);
  });
  it('resolve 任一 source → 同一 masterPatientId（跨域实测）', async () => {
    for (const [ss, spid] of [['HIS',`H-${SALT}`],['LIS',`L-${SALT}`],['PACS',`P-${SALT}`]] as const) {
      const r = await call('GET',`/api/v1/empi/resolve?sourceSystem=${ss}&sourcePatientId=${spid}`,{token:doctor});
      expect(r.httpStatus).toBe(200);
      expect(r.data.masterPatientId).toBe(masterId);
    }
  });
  it('重复 link → 409 duplicate-link', async () => {
    const r = await call('POST','/api/v1/empi/links',{token:admin,body:{sourceSystem:'HIS',sourcePatientId:`H-${SALT}`}});
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });
  it('match by idCard → confidence=exact', async () => {
    const r = await call('GET',`/api/v1/empi/match?idCard=${IDCARD}`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(r.data.confidence).toBe('exact');
    expect(r.data.masterPatientId).toBe(masterId);
  });
  it('match by 姓名+生日+性别 → confidence=probable', async () => {
    const r = await call('GET',`/api/v1/empi/match?name=${encodeURIComponent(UNIQ_NAME)}&birthDate=1990-01-01&gender=M`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(r.data.confidence).toBe('probable');
  });
  it('match 不存在 → confidence=none', async () => {
    const r = await call('GET',`/api/v1/empi/match?phone=00000000000`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(r.data.matched).toBe(false);
    expect(r.data.confidence).toBe('none');
  });
  it('doctor 不能 POST /links（403）', async () => {
    const r = await call('POST','/api/v1/empi/links',{token:doctor,body:{sourceSystem:'HIS',sourcePatientId:'x'}});
    expect(r.httpStatus).toBe(403);
  });
});

describe('XDS', () => {
  let docId = '';
  it('GET /document-types → ≥8 个 LOINC 码', async () => {
    const r = await call('GET','/api/v1/xds/document-types',{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(r.data.types.length).toBeGreaterThanOrEqual(8);
  });
  it('注册文档 → documentId + contentHash 64 hex', async () => {
    const r = await call('POST','/api/v1/xds/documents',{token:doctor,body:{
      patientId:`P-${SALT}`, documentType:'11506-3', title:'病程记录',
      authorId:'doc1', authorOrg:'健澜院', content:'今日患者一般情况可。',
    }});
    expect(r.httpStatus).toBe(201);
    expect(r.data.documentId).toMatch(/^XDS-/);
    expect(r.data.contentHash).toMatch(/^[0-9a-f]{64}$/);
    docId = r.data.documentId;
  });
  it('重复注册同内容 → 409', async () => {
    const r = await call('POST','/api/v1/xds/documents',{token:doctor,body:{
      patientId:`P-${SALT}`, documentType:'11506-3', title:'病程记录-v2',
      authorId:'doc1', authorOrg:'健澜院', content:'今日患者一般情况可。',
    }});
    expect(r.httpStatus).toBe(409);
  });
  it('documentType 不在码表 → 400', async () => {
    const r = await call('POST','/api/v1/xds/documents',{token:doctor,body:{
      patientId:`P-${SALT}`, documentType:'BAD-CODE', title:'t', authorId:'a', authorOrg:'o', content:'c',
    }});
    expect(r.httpStatus).toBe(400);
  });
  it('query 按 patientId → 非空', async () => {
    const r = await call('GET',`/api/v1/xds/documents?patientId=P-${SALT}`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThanOrEqual(1);
  });
  it('query 按 documentType 过滤生效', async () => {
    const r = await call('GET',`/api/v1/xds/documents?documentType=11506-3`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    for (const row of r.data.rows) expect(row.documentType).toBe('11506-3');
  });
  it('取 content → hashValid=true（实测）', async () => {
    const r = await call('GET',`/api/v1/xds/documents/${docId}/content`,{token:doctor});
    expect(r.httpStatus).toBe(200);
    expect(r.data.hashValid).toBe(true);
    expect(r.data.content).toContain('一般情况');
  });
  it('documentId 不存在 → 404', async () => {
    const r = await call('GET','/api/v1/xds/documents/nope',{token:doctor});
    expect(r.httpStatus).toBe(404);
  });
  it('patient 角色访问 xds → 403', async () => {
    const r = await call('GET','/api/v1/xds/documents',{token:patientRole});
    expect(r.httpStatus).toBe(403);
  });
});
