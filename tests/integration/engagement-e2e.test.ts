/**
 * 健澜AI原生医院操作系统OS - P3-4 报告推送+满意度闭环工单 端到端
 *
 * 真实 HTTP 打 8080，自签 patient/admin JWT。
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
const PID = `P-EN-${SALT}`;
const OTHER = `P-OTHER-${SALT}`;
const patientSelf = sign(['patient'], '患者本人', PID);
const patientOther = sign(['patient'], '另一患者', OTHER);
const admin = sign(['admin'], '管理员', 'admin-1');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P3-4 报告推送', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/api/v1/engagement/reports?patientId=X');
    expect(r.httpStatus).toBe(401);
  });
  it('发布普通报告 → channels=[in-app]、status=pushed', async () => {
    const r = await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:PID, visitId:'V1', type:'lab', title:'血常规', result:'WBC 6.5', isAbnormal:false,
    }});
    expect(r.httpStatus).toBe(200); expect(r.data.pushChannels).toEqual(['in-app']);
  });
  it('发布异常报告 → channels=[in-app,sms]（isAbnormal 加推 sms 实测）', async () => {
    const r = await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:PID, visitId:'V1', type:'lab', title:'血钾危急值', result:'K 2.5', isAbnormal:true,
    }});
    expect(r.data.pushChannels).toEqual(['in-app','sms']);
  });
  it('patient 查自己报告列表非空', async () => {
    const r = await call('GET',`/api/v1/engagement/reports?patientId=${PID}`,{token:patientSelf});
    expect(r.data.length).toBe(2);
  });
  it('patient 查别人报告 → 403', async () => {
    const r = await call('GET',`/api/v1/engagement/reports?patientId=${OTHER}`,{token:patientSelf});
    expect(r.httpStatus).toBe(403);
  });
  it('read 幂等', async () => {
    const list = await call('GET',`/api/v1/engagement/reports?patientId=${PID}`,{token:patientSelf});
    const rid = list.data[0].reportId;
    const r1 = await call(`POST`,`/api/v1/engagement/reports/${rid}/read?patientId=${PID}`,{token:patientSelf});
    expect(r1.data.status).toBe('read');
    const r2 = await call(`POST`,`/api/v1/engagement/reports/${rid}/read?patientId=${PID}`,{token:patientSelf});
    expect(r2.data.status).toBe('read');
  });
});

describe('P3-4 满意度闭环工单', () => {
  it('患者建工单', async () => {
    const r = await call('POST','/api/v1/engagement/tickets',{token:patientSelf,body:{
      patientId:PID, subject:'候诊太久', description:'候诊 2 小时',
    }});
    expect(r.httpStatus).toBe(200); expect(r.data.status).toBe('open');
  });
  it('_seed 灌低分自动工单 source=low-satisfaction', async () => {
    const r = await call('POST','/api/v1/engagement/_seed',{token:admin,body:{lowSatisfaction:[
      { patientId:PID, surveyId:'SV-1', comment:'score=2 不满意' },
    ]}});
    expect(r.data.tickets[0].source).toBe('low-satisfaction');
  });
  it('患者 comment 工单', async () => {
    const list = await call('GET',`/api/v1/engagement/tickets?patientId=${PID}`,{token:patientSelf});
    const tid = list.data[0].ticketId;
    const r = await call('POST',`/api/v1/engagement/tickets/${tid}/comment`,{token:patientSelf,body:{content:'补充：已通过电话联系'}});
    expect(r.data.comments.length).toBeGreaterThan(0);
  });
  it('患者改状态 → 403', async () => {
    const list = await call('GET',`/api/v1/engagement/tickets?patientId=${PID}`,{token:patientSelf});
    const tid = list.data[0].ticketId;
    const r = await call('POST',`/api/v1/engagement/tickets/${tid}/status`,{token:patientSelf,body:{status:'investigating'}});
    expect(r.httpStatus).toBe(403);
  });
  it('admin 非法跃迁 open→closed → 409', async () => {
    const list = await call('GET',`/api/v1/engagement/tickets?patientId=${PID}`,{token:admin});
    const tid = list.data[0].ticketId;
    const r = await call('POST',`/api/v1/engagement/tickets/${tid}/status`,{token:admin,body:{status:'closed'}});
    expect(r.httpStatus).toBe(409); expect(r.code).toBe(40900);
  });
  it('admin 正常流转 → investigating→resolved→closed（关单必须 comment）', async () => {
    const list = await call('GET',`/api/v1/engagement/tickets?patientId=${PID}`,{token:admin});
    const tid = list.data[0].ticketId;
    const a = await call('POST',`/api/v1/engagement/tickets/${tid}/status`,{token:admin,body:{status:'investigating'}});
    expect(a.data.status).toBe('investigating');
    const b = await call('POST',`/api/v1/engagement/tickets/${tid}/status`,{token:admin,body:{status:'resolved'}});
    expect(b.data.status).toBe('resolved');
    const cNoComment = await call('POST',`/api/v1/engagement/tickets/${tid}/status`,{token:admin,body:{status:'closed'}});
    expect(cNoComment.httpStatus).toBe(400);
    const c = await call('POST',`/api/v1/engagement/tickets/${tid}/status`,{token:admin,body:{status:'closed',comment:'已电话致歉并补偿'}});
    expect(c.data.status).toBe('closed');
  });
});
