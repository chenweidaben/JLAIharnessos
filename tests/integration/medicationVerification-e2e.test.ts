/**
 * 健澜AI原生医院操作系统OS - P1-7 医嘱执行机读核对 端到端
 *
 * 真实 HTTP 打 8080，自签 nurse/doctor JWT。
 * 可重跑：每次运行用 Date.now() 盐值生成唯一 orderNo/patientId/visitId。
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
const VID = `V-MV-${SALT}`;
const PID = `P-MV-${SALT}`;
const ORDER_L1 = `ORD-L1-${SALT}`;
const ORDER_L3 = `ORD-L3-${SALT}`;
const ORDER_L5 = `ORD-L5-${SALT}`;
const nurse = sign(['nurse'], '护士', 'nurse-mv');
const doctor = sign(['doctor'], '医生', 'doc-mv');

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
});

describe('P1-7 创建与角色', () => {
  it('无 token → 401；nurse 创建 → 403；doctor 创建 L1/L3/L5 → created', async () => {
    const nt = await call('POST','/api/v1/medication-verification/orders',{body:{orderNo:'X'}});
    expect(nt.httpStatus).toBe(401);
    const asNurse = await call('POST','/api/v1/medication-verification/orders',{token:nurse,body:{orderNo:ORDER_L1,visitId:VID,patientId:PID,drugName:'药',drugCode:'D-A',dose:'10mg',route:'po',scheduledAt:Date.now(),safetyLevel:1,isHighAlert:false}});
    expect(asNurse.httpStatus).toBe(403);
    const c1 = await call('POST','/api/v1/medication-verification/orders',{token:doctor,body:{orderNo:ORDER_L1,visitId:VID,patientId:PID,drugName:'药A',drugCode:'D-A',dose:'10mg',route:'po',scheduledAt:Date.now(),safetyLevel:1,isHighAlert:false}});
    expect(c1.httpStatus).toBe(200); expect(c1.data.state).toBe('created');
    const c3 = await call('POST','/api/v1/medication-verification/orders',{token:doctor,body:{orderNo:ORDER_L3,visitId:VID,patientId:PID,drugName:'肝素',drugCode:'D-HEP',dose:'5000u',route:'sc',scheduledAt:Date.now(),safetyLevel:3,isHighAlert:true}});
    expect(c3.httpStatus).toBe(200);
    const c5 = await call('POST','/api/v1/medication-verification/orders',{token:doctor,body:{orderNo:ORDER_L5,visitId:VID,patientId:PID,drugName:'吗啡',drugCode:'D-MOR',dose:'5mg',route:'iv',scheduledAt:Date.now(),safetyLevel:5,isHighAlert:true}});
    expect(c5.httpStatus).toBe(200);
  });
});

describe('P1-7 完整核对与执行链路（L1 单人）', () => {
  it('腕带不匹配 403 → 正确腕带 → 药品不符 422 → 正确条码 → 执行 → 重复执行 409', async () => {
    const badWb = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L1}/scan-wristband`,{token:nurse,body:{patientIdScanned:'P-WRONG',nurseId:'n1'}});
    expect(badWb.httpStatus).toBe(403); expect(badWb.code).toBe(40300);
    const wb = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L1}/scan-wristband`,{token:nurse,body:{patientIdScanned:PID,nurseId:'n1'}});
    expect(wb.data.state).toBe('wristband_scanned');
    const badBc = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L1}/scan-barcode`,{token:nurse,body:{drugCodeScanned:'D-WRONG',nurseId:'n1'}});
    expect(badBc.httpStatus).toBe(422); expect(badBc.code).toBe(42200);
    const bc = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L1}/scan-barcode`,{token:nurse,body:{drugCodeScanned:'D-A',nurseId:'n1'}});
    expect(bc.data.state).toBe('barcode_scanned');
    const ex = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L1}/execute`,{token:nurse,body:{nurseId:'n1'}});
    expect(ex.data.state).toBe('executed');
    const dup = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L1}/execute`,{token:nurse,body:{nurseId:'n1'}});
    expect(dup.httpStatus).toBe(409);
  });
});

describe('P1-7 L3 双人核对', () => {
  it('缺 witness → 400；witness==nurse → 400；双工号不同人 → 200', async () => {
    const noW = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L3}/scan-wristband`,{token:nurse,body:{patientIdScanned:PID,nurseId:'n1'}});
    expect(noW.httpStatus).toBe(400);
    const sameW = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L3}/scan-wristband`,{token:nurse,body:{patientIdScanned:PID,nurseId:'n1',witnessNurseId:'n1'}});
    expect(sameW.httpStatus).toBe(400);
    const ok = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L3}/scan-wristband`,{token:nurse,body:{patientIdScanned:PID,nurseId:'n1',witnessNurseId:'n2'}});
    expect(ok.httpStatus).toBe(200);
  });
});

describe('P1-7 L5 停药需主任审批', () => {
  it('L5 停药无 approverId → 400；带 approverId → discontinued', async () => {
    const noA = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L5}/discontinue`,{token:nurse,body:{nurseId:'n1'}});
    expect(noA.httpStatus).toBe(400);
    const ok = await call('POST',`/api/v1/medication-verification/orders/${ORDER_L5}/discontinue`,{token:nurse,body:{nurseId:'n1',approverId:'chief-1'}});
    expect(ok.data.state).toBe('discontinued');
  });
});

describe('P1-7 非法跃迁', () => {
  it('created 直接 execute（未扫腕带）→ 409', async () => {
    const c = await call('POST','/api/v1/medication-verification/orders',{token:doctor,body:{orderNo:`ORD-NX-${SALT}`,visitId:VID,patientId:PID,drugName:'x',drugCode:'D-X',dose:'',route:'',scheduledAt:Date.now(),safetyLevel:1,isHighAlert:false}});
    const nx = await call('POST',`/api/v1/medication-verification/orders/${c.data.orderNo}/execute`,{token:nurse,body:{nurseId:'n1'}});
    expect(nx.httpStatus).toBe(409);
  });
});
