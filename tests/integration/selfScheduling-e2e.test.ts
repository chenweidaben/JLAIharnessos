/**
 * 健澜AI原生医院操作系统OS - P3-3 号源池+患者自助预约 端到端
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
const PID = `P-SS-${SALT}`;
const OTHER = `P-OTHER-${SALT}`;
const patientSelf = sign(['patient'], '患者本人', PID);
const patientOther = sign(['patient'], '另一患者', OTHER);
const doctor = sign(['doctor'], '医生', 'doc-ss');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P3-3 号源池', () => {
  it('无 token → 401', async () => {
    const r = await call('GET','/api/v1/self-scheduling/departments');
    expect(r.httpStatus).toBe(401);
  });
  it('departments 列表非空', async () => {
    const r = await call('GET','/api/v1/self-scheduling/departments',{token:patientSelf});
    expect(r.httpStatus).toBe(200);
    expect(r.data.length).toBeGreaterThan(0);
  });
  it('_seed 灌号源（capacity=2 的门诊号 + capacity=1 的 CT 检查号）', async () => {
    const r = await call('POST','/api/v1/self-scheduling/slots/_seed',{token:doctor,body:{items:[
      { departmentId:'cardiology', doctorId:'D1', date:'2099-11-10', timeSlot:'08:00-08:30', slotType:'outpatient', capacity:2 },
      { departmentId:'checkup-center', date:'2099-11-10', timeSlot:'09:00-09:30', slotType:'checkup', examType:'CT', capacity:1 },
    ]}});
    expect(r.httpStatus).toBe(200); expect(r.data.seeded).toBe(2);
  });
  it('listSlots 按 date/slotType 过滤', async () => {
    const r = await call('GET','/api/v1/self-scheduling/slots?date=2099-11-10',{token:patientSelf});
    expect(r.data.length).toBe(2);
    const ct = await call('GET','/api/v1/self-scheduling/slots?date=2099-11-10&slotType=checkup',{token:patientSelf});
    expect(ct.data.length).toBe(1); expect(ct.data[0].examType).toBe('CT');
  });
});

describe('P3-3 预约/取消', () => {
  it('patient 预约成功 booked++', async () => {
    const slots = await call('GET','/api/v1/self-scheduling/slots?date=2099-11-10&slotType=outpatient',{token:patientSelf});
    const slotId = slots.data[0].slotId;
    const r = await call('POST','/api/v1/self-scheduling/bookings',{token:patientSelf,body:{patientId:PID,slotId}});
    expect(r.httpStatus).toBe(200); expect(r.data.status).toBe('booked');
  });
  it('doctor 预约 → 403', async () => {
    const slots = await call('GET','/api/v1/self-scheduling/slots?date=2099-11-10&slotType=outpatient',{token:doctor});
    const slotId = slots.data[0].slotId;
    const r = await call('POST','/api/v1/self-scheduling/bookings',{token:doctor,body:{patientId:PID,slotId}});
    expect(r.httpStatus).toBe(403);
  });
  it('重复预约同 slot → 409', async () => {
    const slots = await call('GET','/api/v1/self-scheduling/slots?date=2099-11-10&slotType=outpatient',{token:patientSelf});
    const slotId = slots.data[0].slotId;
    const r = await call('POST','/api/v1/self-scheduling/bookings',{token:patientSelf,body:{patientId:PID,slotId}});
    expect(r.httpStatus).toBe(409); expect(r.code).toBe(40900);
  });
  it('CT 检查号 capacity=1：第二人预约 → 409（号源满/已 closed）', async () => {
    const ct = await call('GET','/api/v1/self-scheduling/slots?date=2099-11-10&slotType=checkup',{token:patientSelf});
    const slotId = ct.data[0].slotId;
    const first = await call('POST','/api/v1/self-scheduling/bookings',{token:patientOther,body:{patientId:OTHER,slotId}});
    expect(first.httpStatus).toBe(200);
    const second = await call('POST','/api/v1/self-scheduling/bookings',{token:patientSelf,body:{patientId:PID,slotId}});
    expect(second.httpStatus).toBe(409);
  });
  it('patient 查别人 bookings → 403', async () => {
    const r = await call('GET',`/api/v1/self-scheduling/bookings?patientId=${OTHER}`,{token:patientSelf});
    expect(r.httpStatus).toBe(403);
  });
  it('cancel 释放号源；重复取消 409', async () => {
    const mine = await call('GET',`/api/v1/self-scheduling/bookings?patientId=${PID}`,{token:patientSelf});
    const bid = mine.data[0].bookingId;
    const c = await call('POST',`/api/v1/self-scheduling/bookings/${bid}/cancel?patientId=${PID}`,{token:patientSelf});
    expect(c.data.status).toBe('cancelled');
    const dup = await call('POST',`/api/v1/self-scheduling/bookings/${bid}/cancel?patientId=${PID}`,{token:patientSelf});
    expect(dup.httpStatus).toBe(409);
  });
});
