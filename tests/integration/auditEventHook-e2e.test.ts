/**
 * 健澜AI原生医院操作系统OS - P4-2 审计中间件全局埋点 端到端
 *
 * 真实 HTTP 打 8080：
 *  ① 带 token POST /api/v1/engagement/reports（业务写）→ 应被 hook 自动落为 AuditEvent
 *  ② 无 token POST /api/v1/engagement/reports（401）→ 应落为 anonymous/forbidden
 *  ③ GET /api/v1/audit/events 用 admin 查 module=engagement 应能查到刚记录的事件
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
  return { httpStatus: res.status, code:raw?.code, data:raw?.data??null };
}

const SALT = Date.now().toString(36);
const ADMIN = `AUD-HOOK-${SALT}`;
const PATIENT = `P-HOOK-${SALT}`;
const admin = sign(['admin'], '管理员', ADMIN);
const patient = sign(['patient'], '患者', PATIENT);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P4-2 全局审计 after-hook', () => {
  it('带 token POST 业务接口成功 → 审计自动落 success', async () => {
    // 先查基线
    const before = await call('GET','/api/v1/audit/events?module=engagement&limit=500',{token:admin});
    const beforeTotal = before.data.total;
    // 触发一次业务写
    const r = await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:PATIENT, visitId:'V1', type:'lab', title:'血常规', result:'WBC 6.5', isAbnormal:false,
    }});
    expect(r.httpStatus).toBe(200);
    // 等一拍（after-hook 同步执行，无需 sleep）
    const after = await call('GET','/api/v1/audit/events?module=engagement&limit=500',{token:admin});
    expect(after.data.total).toBeGreaterThanOrEqual(beforeTotal + 1);
    // 最新一条应是 create / success / admin
    const top = after.data.rows[0];
    expect(top.action).toBe('create');
    expect(top.result).toBe('success');
    expect(top.actorId).toBe(ADMIN);
    expect(top.module).toBe('engagement');
  });
  it('无 token POST 业务接口 401 → 审计落 anonymous/forbidden', async () => {
    const before = await call('GET','/api/v1/audit/events?module=engagement&limit=500',{token:admin});
    const beforeTotal = before.data.total;
    // 无 token 触发 401
    const r = await call('POST','/api/v1/engagement/reports',{body:{patientId:PATIENT,visitId:'V1',type:'lab',title:'x',result:'',isAbnormal:false}});
    expect(r.httpStatus).toBe(401);
    const after = await call('GET','/api/v1/audit/events?module=engagement&limit=500',{token:admin});
    expect(after.data.total).toBeGreaterThanOrEqual(beforeTotal + 1);
    const top = after.data.rows[0];
    expect(top.actorId).toBe('anonymous');
    expect(top.result).toBe('forbidden');
  });
  it('POST /api/v1/audit/* 自身不递归（审计接口自身不产生新审计事件）', async () => {
    const before = await call('GET','/api/v1/audit/events?module=audit&limit=500',{token:admin});
    const beforeTotal = before.data.total;
    // 调一次 /audit/_seed（admin）
    await call('POST','/api/v1/audit/events/_seed',{token:admin,body:{items:[]}});
    const after = await call('GET','/api/v1/audit/events?module=audit&limit=500',{token:admin});
    // _seed 本身不该被 hook 记录，且 items=[] 也不产生新事件
    expect(after.data.total).toBe(beforeTotal);
  });
});
