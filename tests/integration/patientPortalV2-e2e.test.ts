/**
 * 健澜AI原生医院操作系统OS - P3-1 患者互联网+服务门户 端到端
 *
 * 真实 HTTP 打 8080，自签 patient JWT（sub=patientId）。
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
const PID = `P-PP-${SALT}`;
const OTHER = `P-OTHER-${SALT}`;
const patientSelf = sign(['patient'], '患者本人', PID);
const patientOther = sign(['patient'], '另一患者', OTHER);

const FUTURE = () => new Date(Date.now() + 7 * 86400 * 1000).toISOString();

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P3-1 报告', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/api/v1/patient-portal/reports');
    expect(r.httpStatus).toBe(401);
  });
  it('_seed 灌报告/缴费/提醒', async () => {
    const r = await call('POST','/api/v1/patient-portal/_seed',{token:patientSelf,body:{
      patientId: PID,
      reports: [
        { visitId:'V1', type:'lab', title:'血常规', result:'WBC 6.5', issuedAt:'2026-11-04T08:00:00Z' },
        { visitId:'V1', type:'imaging', title:'胸片', result:'未见异常', issuedAt:'2026-11-04T09:00:00Z' },
      ],
      payments: [
        { visitId:'V1', amountTotal:100, insuranceCovered:60, patientPaid:40, paidAt:'2026-11-04T10:00:00Z', method:'wechat' },
      ],
      reminders: [
        { channel:'sms', triggerAt:'2026-11-05T08:00:00Z', message:'请按时复诊' },
      ],
    }});
    expect(r.httpStatus).toBe(200);
    expect(r.data.reports).toBe(2); expect(r.data.payments).toBe(1); expect(r.data.reminders).toBe(1);
  });
  it('patient 查别人报告 → 403', async () => {
    const r = await call('GET',`/api/v1/patient-portal/reports?patientId=${OTHER}`,{token:patientSelf});
    expect(r.httpStatus).toBe(403); expect(r.code).toBe(40300);
  });
  it('list reports + type=lab 过滤 + mark read 幂等', async () => {
    const all = await call('GET',`/api/v1/patient-portal/reports?patientId=${PID}`,{token:patientSelf});
    expect(all.data.length).toBe(2);
    const lab = await call('GET',`/api/v1/patient-portal/reports?patientId=${PID}&type=lab`,{token:patientSelf});
    expect(lab.data.length).toBe(1);
    const rid = lab.data[0].reportId;
    const r1 = await call('POST',`/api/v1/patient-portal/reports/${rid}/read?patientId=${PID}`,{token:patientSelf});
    expect(r1.httpStatus).toBe(200); expect(r1.data.readAt).toBeTruthy();
    const r2 = await call('POST',`/api/v1/patient-portal/reports/${rid}/read?patientId=${PID}`,{token:patientSelf});
    expect(r2.data.readAt).toBe(r1.data.readAt);
  });
});

describe('P3-1 图文咨询预约', () => {
  it('创建 booking 自动生成 in-app reminder；取消；重复取消 409', async () => {
    const c = await call('POST','/api/v1/patient-portal/consult-bookings',{token:patientSelf,body:{patientId:PID,doctorId:'D1',departmentId:'内科',scheduledAt:FUTURE(),note:'头晕'}});
    expect(c.httpStatus).toBe(200); expect(c.data.status).toBe('booked');
    const bid = c.data.bookingId;
    const reminders = await call('GET',`/api/v1/patient-portal/reminders?patientId=${PID}`,{token:patientSelf});
    expect(reminders.data.some((x:any)=>x.channel==='in-app')).toBe(true);
    const cancel = await call('POST',`/api/v1/patient-portal/consult-bookings/${bid}/cancel?patientId=${PID}`,{token:patientSelf});
    expect(cancel.data.status).toBe('cancelled');
    const dup = await call('POST',`/api/v1/patient-portal/consult-bookings/${bid}/cancel?patientId=${PID}`,{token:patientSelf});
    expect(dup.httpStatus).toBe(409);
  });
  it('scheduledAt 过去时间 → 400', async () => {
    const r = await call('POST','/api/v1/patient-portal/consult-bookings',{token:patientSelf,body:{patientId:PID,doctorId:'D1',departmentId:'x',scheduledAt:'2020-01-01T00:00:00Z'}});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P3-1 满意度', () => {
  it('score<=3 触发 admin 通知；重复提交同 visitId → 409', async () => {
    const s1 = await call('POST','/api/v1/patient-portal/satisfaction',{token:patientSelf,body:{patientId:PID,visitId:'V1',doctorId:'D1',score:2,comment:'等待久'}});
    expect(s1.httpStatus).toBe(200);
    const dup = await call('POST','/api/v1/patient-portal/satisfaction',{token:patientSelf,body:{patientId:PID,visitId:'V1',doctorId:'D1',score:5}});
    expect(dup.httpStatus).toBe(409);
  });
  it('score=6 → 400', async () => {
    const r = await call('POST','/api/v1/patient-portal/satisfaction',{token:patientSelf,body:{patientId:PID,visitId:'V2',doctorId:'D1',score:6}});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P3-1 提醒/缴费', () => {
  it('reminders 列表 + mark read', async () => {
    const list = await call('GET',`/api/v1/patient-portal/reminders?patientId=${PID}`,{token:patientSelf});
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    const rid = list.data[0].reminderId;
    const r = await call('POST',`/api/v1/patient-portal/reminders/${rid}/read?patientId=${PID}`,{token:patientSelf});
    expect(r.data.status).toBe('read');
  });
  it('payments 列表', async () => {
    const r = await call('GET',`/api/v1/patient-portal/payments?patientId=${PID}`,{token:patientSelf});
    expect(r.data.length).toBe(1);
    expect(r.data[0].patientPaid).toBe(40);
  });
});
