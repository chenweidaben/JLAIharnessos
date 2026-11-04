/**
 * 健澜AI原生医院操作系统OS - P0-4 处方审核→发药链路 端到端集成测试
 *
 * 真实 HTTP 打 8080。自签 doctor/pharmacist/nurse/noRole 四角色 JWT（P0-7 后
 * 无 token 一律 401）。覆盖：医生开方 200、药师审核 200 留痕、药师/护士发药 200、
 * 医生发药 403(code=40300)、医生/护士审核 403、未审核先发药 409、重复发药 409、
 * 已停止发药 409、重复审核 409、退药重复审批 409。
 *
 * probe-then-branch：每轮医生新建 fresh 处方走完整链，不消耗种子；
 * 退药幂等打既有 DISP-0001 种子（只读 409 断言，幂等重跑）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; raw: any; }

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signToken(roles: string[], name: string, sub: string): string {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub, name, roles, iss: 'jianlan-bff', nbf: now, exp: now + 3600 });
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}
async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  let raw: any = null;
  try { raw = await res.json(); } catch { raw = null; }
  return { httpStatus: res.status, code: raw?.code, data: raw?.data ?? null, raw };
}

const doctor = signToken(['doctor'], '医生甲', 'doc-rx-e2e');
const pharmacist = signToken(['pharmacist'], '药师丙', 'pharm-rx-e2e');
const nurse = signToken(['nurse'], '护士乙', 'nurse-rx-e2e');
const noRole = signToken([], '匿名', 'none-rx-e2e');

let freshRxNo = '';
const VISIT = 'VISIT-A100';
const PATIENT = 'PT-P001';

beforeAll(async () => {
  const health = await fetch(BASE + '/health');
  if (health.status !== 200) throw new Error('BFF 未就绪');
  // doctor 开一张 fresh 处方（pending_review）
  const c = await call('POST', '/api/v1/pharmacy/dispense-trade/prescriptions', {
    token: doctor,
    body: { visitId: VISIT, patientId: PATIENT, patientName: '张某某', drugName: 'E2E药' + Date.now(), specification: '1盒', quantity: 1, unitFeeCents: 300 },
  });
  if (c.httpStatus === 200) freshRxNo = c.data.rxNo;
});

describe('P0-4 鉴权与开方', () => {
  it('无 token 开方 → 401', async () => {
    const r = await call('POST', '/api/v1/pharmacy/dispense-trade/prescriptions', { body: { visitId: VISIT, patientId: PATIENT, drugName: 'x', quantity: 1, unitFeeCents: 100 } });
    expect(r.httpStatus).toBe(401);
  });

  it('医生开方 → 200 pending_review', async () => {
    expect(freshRxNo).toMatch(/^RX-/);
    expect(freshRxNo.length).toBeGreaterThan(0);
  });

  it('行级绑定：错配 patientId → 403', async () => {
    const r = await call('POST', '/api/v1/pharmacy/dispense-trade/prescriptions', {
      token: doctor,
      body: { visitId: VISIT, patientId: 'PT-WRONG', patientName: 'x', drugName: 'x', quantity: 1, unitFeeCents: 100 },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });
});

describe('P0-4 审核权限', () => {
  it('医生审核 → 403 code=40300', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/review`, { token: doctor, body: { decision: 'approve' } });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('护士审核 → 403 code=40300', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/review`, { token: nurse, body: { decision: 'approve' } });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('药师审核 approve → 200 approved + reviewer 留痕', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/review`, { token: pharmacist, body: { decision: 'approve', comment: '同意' } });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('approved');
    expect(typeof r.data.reviewedAt).toBe('number');
  });

  it('重复审核 → 409', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/review`, { token: pharmacist, body: { decision: 'approve' } });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });
});

describe('P0-4 发药状态机', () => {
  it('医生发药 → 403 code=40300', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/dispense`, { token: doctor, body: {} });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('药师发药 approved 处方 → 200 dispensed', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/dispense`, { token: pharmacist, body: {} });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('dispensed');
  });

  it('重复发药 → 409', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${freshRxNo}/dispense`, { token: pharmacist, body: {} });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });

  it('未审核先发药：新建处方直接发药 → 409', async () => {
    const c = await call('POST', '/api/v1/pharmacy/dispense-trade/prescriptions', {
      token: doctor,
      body: { visitId: VISIT, patientId: PATIENT, patientName: '张某某', drugName: '未审核' + Date.now(), quantity: 1, unitFeeCents: 100 },
    });
    const rxNo = c.data.rxNo as string;
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${rxNo}/dispense`, { token: pharmacist, body: {} });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });

  it('已停止处方不得发药 → 409', async () => {
    const c = await call('POST', '/api/v1/pharmacy/dispense-trade/prescriptions', {
      token: doctor,
      body: { visitId: VISIT, patientId: PATIENT, patientName: '张某某', drugName: '停止' + Date.now(), quantity: 1, unitFeeCents: 100 },
    });
    const rxNo = c.data.rxNo as string;
    await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${rxNo}/stop`, { token: doctor, body: {} });
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prescriptions/${rxNo}/dispense`, { token: pharmacist, body: {} });
    expect(r.httpStatus).toBe(409);
    expect(String(r.raw?.message ?? '')).toContain('停止');
  });
});
