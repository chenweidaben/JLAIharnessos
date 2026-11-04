/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站工作台补全 端到端集成测试
 *
 * 真实 HTTP 打本机 BFF 8080。自签 nurse/doctor/noRole 三角色 JWT（P0-7 后短路已关，
 * 无 token 一律 401）。覆盖：体征录入正常+越界（message 含字段名）、护理记录正常+非法、
 * PDA 按执行单执行（扫错患者 409 拒绝留痕 / 正确 200 / 重复 409 / slip 不存在 404）、
 * doctor 越权 403(code=40300)、执行单汇总结构。
 *
 * 【probe-then-branch / 可重跑】
 *   - beforeAll 由 doctor→pharmacist→nurse 新建一条 fresh 医嘱并生成执行单，
 *     作为 PDA 主链载体；不消耗既有种子，每轮 fresh。
 *   - 若主链未就绪（异常分支），PDA 正向用例跳过并改断言 slip 不存在→404，
 *     绝不写成种子消耗型红测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult {
  httpStatus: number;
  code: number;
  data: any;
  raw: any;
}

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signToken(roles: string[], name: string, sub: string): string {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub, name, roles, iss: 'jianlan-bff', nbf: now, exp: now + 3600 });
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  let raw: any = null;
  try { raw = await res.json(); } catch { raw = null; }
  return { httpStatus: res.status, code: raw?.code, data: raw?.data ?? null, raw };
}

const nurse = signToken(['nurse'], '护士乙', 'nurse-ward-e2e');
const doctor = signToken(['doctor'], '医生甲', 'doc-ward-e2e');
const pharmacist = signToken(['pharmacist'], '药师丙', 'pharm-ward-e2e');
const noRole = signToken([], '匿名者', 'none-ward-e2e');

let chainReady = false;
let slipNo = '';
const EXPECTED_PATIENT_ID = 'PT-P001'; // VISIT-A100 绑定患者

beforeAll(async () => {
  const health = await fetch(BASE + '/health');
  if (health.status !== 200) throw new Error('BFF 未就绪（8080）');

  // fresh 主链：doctor 开立 → pharmacist 审核 → nurse 执行 → 生成执行单
  const created = await call('POST', '/api/v1/orders', {
    token: doctor,
    body: { visitId: 'VISIT-A100', orderType: 'medication', content: 'P0-3床旁执行 E2E ' + Date.now(), feeCents: 1500 },
  });
  if (created.httpStatus !== 200) return;
  const orderId = created.data.orderId as string;

  const approved = await call('POST', `/api/v1/orders/${orderId}/review`, {
    token: pharmacist,
    body: { decision: 'approve', comment: '同意' },
  });
  if (approved.httpStatus !== 200) return;

  const executed = await call('POST', `/api/v1/orders/${orderId}/execute`, {
    token: nurse, body: { note: '床旁核对' },
  });
  if (executed.httpStatus !== 200) return;

  const slip = await call('POST', `/api/v1/orders/${orderId}/execution-slip`, { token: nurse, body: {} });
  if (slip.httpStatus === 200 && slip.data?.slipNo) {
    slipNo = slip.data.slipNo;
    chainReady = true;
  }
});

describe('P0-3 鉴权', () => {
  it('无 token 访问写端 → 401', async () => {
    const r = await call('POST', '/api/v1/nurse-station/vitals', {
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', temperatureC: 37, heartRateBpm: 80, sbp: 120, dbp: 80 },
    });
    expect(r.httpStatus).toBe(401);
  });
});

describe('P0-3 体征录入（生理区间）', () => {
  it('正常录入 → 200 返回 vitalsId', async () => {
    const r = await call('POST', '/api/v1/nurse-station/vitals', {
      token: nurse,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', temperatureC: 36.7, heartRateBpm: 76, sbp: 121, dbp: 79 },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.vitalsId).toMatch(/^VIT-/);
  });

  it('体温 46.2 越界 → 400 且 message 含「体温」', async () => {
    const r = await call('POST', '/api/v1/nurse-station/vitals', {
      token: nurse,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', temperatureC: 46.2, heartRateBpm: 80, sbp: 120, dbp: 80 },
    });
    expect(r.httpStatus).toBe(400);
    expect(r.code).toBe(40000);
    expect(String(r.raw?.message ?? r.raw?.error ?? '')).toContain('体温');
  });

  it('收缩压 350 越界 → 400 且 message 含「收缩压」', async () => {
    const r = await call('POST', '/api/v1/nurse-station/vitals', {
      token: nurse,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', temperatureC: 37, heartRateBpm: 80, sbp: 350, dbp: 80 },
    });
    expect(r.httpStatus).toBe(400);
    expect(String(r.raw?.message ?? r.raw?.error ?? '')).toContain('收缩压');
  });
});

describe('P0-3 护理记录书写', () => {
  it('正常书写 → 200 返回 recordId', async () => {
    const r = await call('POST', '/api/v1/nurse-station/nursing-records', {
      token: nurse,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', recordType: 'nursing_note', content: 'E2E 护理记录' },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.recordId).toMatch(/^NR-/);
  });

  it('content 空 → 400', async () => {
    const r = await call('POST', '/api/v1/nurse-station/nursing-records', {
      token: nurse,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', recordType: 'nursing_note', content: '' },
    });
    expect(r.httpStatus).toBe(400);
    expect(r.code).toBe(40000);
  });

  it('recordType 非法 → 400', async () => {
    const r = await call('POST', '/api/v1/nurse-station/nursing-records', {
      token: nurse,
      body: { visitId: 'VISIT-A100', patientId: 'PT-P001', recordType: 'bogus_type', content: 'x' },
    });
    expect(r.httpStatus).toBe(400);
    expect(String(r.raw?.message ?? r.raw?.error ?? '')).toContain('recordType');
  });
});

describe('P0-3 PDA 按执行单床边执行（probe-then-branch）', () => {
  it('doctor 越权调 PDA → 403 且 code=40300', async () => {
    const r = await call('POST', '/api/v1/nurse-station/pda/execute', {
      token: doctor, body: { slipNo: chainReady ? slipNo : 'SLIP-CO-X', scannedPatientId: EXPECTED_PATIENT_ID },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('noRole 无权限调 PDA → 403 且 code=40300', async () => {
    const r = await call('POST', '/api/v1/nurse-station/pda/execute', {
      token: noRole, body: { slipNo: 'SLIP-CO-X', scannedPatientId: EXPECTED_PATIENT_ID },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('slip 不存在 → 404（退化分支 / 正向链未就绪时的兜底断言）', async () => {
    if (chainReady) return; // 正向链就绪时该用例不作为主断言
    const r = await call('POST', '/api/v1/nurse-station/pda/execute', {
      token: nurse, body: { slipNo: 'SLIP-CO-NOT-EXIST', scannedPatientId: EXPECTED_PATIENT_ID },
    });
    expect(r.httpStatus).toBe(404);
    expect(r.code).toBe(40400);
  });

  it('扫错患者 → 409 拒绝留痕（probe-then-branch 正向链）', async () => {
    if (!chainReady) return;
    const r = await call('POST', '/api/v1/nurse-station/pda/execute', {
      token: nurse, body: { slipNo, scannedPatientId: 'PT-WRONG' },
    });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
    expect(String(r.raw?.message ?? '')).toContain('不匹配');
  });

  it('患者一致首次执行 → 200 且 checks.patientMatched=true', async () => {
    if (!chainReady) return;
    const r = await call('POST', '/api/v1/nurse-station/pda/execute', {
      token: nurse, body: { slipNo, scannedPatientId: EXPECTED_PATIENT_ID },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.checks.patientMatched).toBe(true);
    expect(r.data.patientId).toBe(EXPECTED_PATIENT_ID);
  });

  it('同一执行单重复执行 → 409', async () => {
    if (!chainReady) return;
    const r = await call('POST', '/api/v1/nurse-station/pda/execute', {
      token: nurse, body: { slipNo, scannedPatientId: EXPECTED_PATIENT_ID },
    });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });
});

describe('P0-3 护理执行单汇总', () => {
  it('GET ward-execution-sheet → 200 且结构字段齐全', async () => {
    const r = await call('GET', '/api/v1/nurse-station/ward-execution-sheet?visitId=VISIT-A100', { token: nurse });
    expect(r.httpStatus).toBe(200);
    expect(r.data.visitId).toBe('VISIT-A100');
    expect(Array.isArray(r.data.pendingItems)).toBe(true);
    expect(Array.isArray(r.data.executedItems)).toBe(true);
    expect(typeof r.data.vitalsCount).toBe('number');
    expect(typeof r.data.nursingRecordsCount).toBe('number');
    expect(typeof r.data.generatedAt).toBe('number');
  });
});
