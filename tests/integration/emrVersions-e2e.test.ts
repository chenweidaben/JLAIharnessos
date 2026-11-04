/**
 * 健澜AI原生医院操作系统OS - P2-1 病历版本管理 端到端
 *
 * 真实 HTTP 打 8080，自签 resident/attending JWT。
 * 可重跑：用 Date.now() 盐值生成唯一 visitId/patientId。
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
const VID = `V-EMR-${SALT}`;
const PID = `P-EMR-${SALT}`;
const resident = sign(['resident'], '住院医', 'r1');
const attending = sign(['attending'], '主治', 'a1');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P2-1 版本管理全链路', () => {
  it('无 token → 401', async () => {
    const r = await call('POST','/api/v1/emr-versions/notes',{body:{title:'t',noteType:'admission',content:{a:'b'}}});
    expect(r.httpStatus).toBe(401);
  });
  it('resident 建 v1 → revise v2（diff 字段）→ attending finalize', async () => {
    const c = await call('POST','/api/v1/emr-versions/notes',{token:resident,body:{visitId:VID,patientId:PID,title:'入院记录',noteType:'admission',content:{chiefComplaint:'腹痛1天',presentIllness:'伴恶心'}}});
    expect(c.httpStatus).toBe(200); expect(c.data.curVersion).toBe(1);
    const noteId = c.data.noteId;
    const rv = await call('POST',`/api/v1/emr-versions/notes/${noteId}/revise`,{token:resident,body:{content:{chiefComplaint:'腹痛3天',presentIllness:'伴恶心',physicalExam:'腹软'}}});
    expect(rv.data.curVersion).toBe(2);
    const v2 = rv.data.versions[1];
    expect(v2.diffFromPrev.map((d:any)=>d.field)).toContain('chiefComplaint');
    // finalize：resident 不行
    const rf = await call('POST',`/api/v1/emr-versions/notes/${noteId}/finalize`,{token:resident,body:{}});
    expect(rf.httpStatus).toBe(403); expect(rf.code).toBe(40300);
    const af = await call('POST',`/api/v1/emr-versions/notes/${noteId}/finalize`,{token:attending,body:{}});
    expect(af.data.state).toBe('finalized');
  });
  it('finalized 后 revise → 409；unlock 后 revise → 200；re-lock → finalized', async () => {
    const c = await call('POST','/api/v1/emr-versions/notes',{token:resident,body:{visitId:VID,patientId:PID,title:'病程',noteType:'progress',content:{chiefComplaint:'x'}}});
    const noteId = c.data.noteId;
    await call('POST',`/api/v1/emr-versions/notes/${noteId}/finalize`,{token:attending,body:{}});
    // finalized revise → 409
    const blocked = await call('POST',`/api/v1/emr-versions/notes/${noteId}/revise`,{token:resident,body:{content:{chiefComplaint:'y'}}});
    expect(blocked.httpStatus).toBe(409); expect(blocked.code).toBe(40900);
    // unlock 无 reason → 400
    const noReason = await call('POST',`/api/v1/emr-versions/notes/${noteId}/unlock-for-edit`,{token:attending,body:{approverId:'a1'}});
    expect(noReason.httpStatus).toBe(400);
    // unlock OK
    const u = await call('POST',`/api/v1/emr-versions/notes/${noteId}/unlock-for-edit`,{token:attending,body:{reason:'补充检验结果',approverId:'a1'}});
    expect(u.data.state).toBe('unlocked'); expect(u.data.unlockReason).toBe('补充检验结果');
    // unlock 后 revise OK
    const rv = await call('POST',`/api/v1/emr-versions/notes/${noteId}/revise`,{token:resident,body:{content:{chiefComplaint:'y',plan:'随访'}}});
    expect(rv.httpStatus).toBe(200); expect(rv.data.curVersion).toBe(2);
    // re-lock
    const rl = await call('POST',`/api/v1/emr-versions/notes/${noteId}/re-lock`,{token:attending,body:{}});
    expect(rl.data.state).toBe('finalized');
  });
  it('GET 版本列表/单版/diff 只读', async () => {
    const c = await call('POST','/api/v1/emr-versions/notes',{token:resident,body:{visitId:VID,patientId:PID,title:'转出',noteType:'transfer',content:{chiefComplaint:'a'}}});
    const noteId = c.data.noteId;
    await call('POST',`/api/v1/emr-versions/notes/${noteId}/revise`,{token:resident,body:{content:{chiefComplaint:'a',plan:'转科'}}});
    const list = await call('GET',`/api/v1/emr-versions/notes/${noteId}/versions`,{token:resident});
    expect(list.data.length).toBe(2);
    const v1 = await call('GET',`/api/v1/emr-versions/notes/${noteId}/versions/1`,{token:resident});
    expect(v1.data.version).toBe(1);
    const d = await call('GET',`/api/v1/emr-versions/notes/${noteId}/diff?from=1&to=2`,{token:resident});
    expect(d.httpStatus).toBe(200); expect(d.data.changes.length).toBeGreaterThan(0);
  });
});
