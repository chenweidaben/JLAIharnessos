/**
 * 健澜AI原生医院操作系统OS - P0-2 医嘱 CPOE 端到端集成测试
 *
 * 真实 HTTP 打本机 BFF 8080（DEMO_MODE=1）。自签 4 角色 JWT 验证权限分级，
 * 并跑通 开立(医生)→审核(药师)→执行(护士)→执行单 主链 + 成套原子 + 状态机 409。
 *
 * 【probe-then-branch / 可重跑设计】
 *   - 主链不消耗种子：医生每次跑新建一条 fresh 医嘱（pending_review），在它上面走完整链，
 *     因此无论运行态 seed 是否已被前一轮消耗都能跑通，不留"种子消耗型"红测。
 *   - 退化/状态机语义断言打既有 seed 单（approved/executed/rejected），只读式 409 断言，
 *     不改变其状态，重跑幂等。
 *   - 成套医嘱原子性：先 GET cpoe 计数，失败组合必须 400 且总数不增（零落库直接证据）。
 *
 * 工程约束：不引入第三方依赖；不改聚合器/路由；金额一律整数分；
 * 每条 it 至少断言一项业务返回值或 body.code 数值，不只看 HTTP 状态码。
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

/** 自签 HS256 JWT（与 middleware/auth.ts 同算法同密钥）。 */
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

/** 统一 HTTP 调用；非 2xx 也返回 body，便于断言 body.code 数值。 */
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

// 4 个 actor
const doctor = signToken(['doctor'], '医生甲', 'doc-e2e-1');
const nurse = signToken(['nurse'], '护士乙', 'nurse-e2e-1');
const pharmacist = signToken(['pharmacist'], '药师丙', 'pharm-e2e-1');
const noRole = signToken([], '匿名者', 'none-e2e-1');

// 主链 fresh 医嘱（beforeAll 由医生新建，pending_review）
let freshOrderId = '';
const FRESH_FEE_CENTS = 1234;
let baselineCount = 0;

beforeAll(async () => {
  const health = await fetch(BASE + '/health');
  if (health.status !== 200) {
    throw new Error('BFF 未就绪：请先 bun run src/bff/server.ts（DEMO_MODE=1），8080 应存活');
  }
  // 计数基线（用于成套原子零落库断言）
  const list = await call('GET', '/api/v1/orders/cpoe');
  baselineCount = Array.isArray(list.data) ? list.data.length : 0;
  // 医生新建一条 fresh 医嘱（write 权限内），作为主链载体
  const created = await call('POST', '/api/v1/orders', {
    token: doctor,
    body: { visitId: 'VISIT-A100', orderType: 'medication', content: 'E2E主链医嘱 ' + Date.now(), feeCents: FRESH_FEE_CENTS },
  });
  expect(created.httpStatus).toBe(200);
  expect(created.data.orderId).toMatch(/^ORD-CO-/);
  expect(created.data.status).toBe('pending_review');
  freshOrderId = created.data.orderId;
});

describe('P0-2 CPOE 权限分级（断言 body.code 数值）', () => {
  it('doctor 可开立(200)但审核 -> 403 且 code=40300', async () => {
    const r = await call('POST', `/api/v1/orders/${freshOrderId}/review`, {
      token: doctor, body: { decision: 'approve', comment: '不应通过' },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('nurse 不可开立 -> 403 且 code=40300', async () => {
    const r = await call('POST', '/api/v1/orders', {
      token: nurse, body: { visitId: 'VISIT-A100', orderType: 'medication', content: '护士越权开立', feeCents: 100 },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });

  it('noRole 任何写操作 -> 403 且 code=40300', async () => {
    const r = await call('POST', '/api/v1/orders', {
      token: noRole, body: { visitId: 'VISIT-A100', orderType: 'medication', content: '匿名开立', feeCents: 100 },
    });
    expect(r.httpStatus).toBe(403);
    expect(r.code).toBe(40300);
  });
});

describe('P0-2 CPOE 主链：药师审核 -> 护士执行 -> 执行单 -> 幂等重打', () => {
  it('pharmacist 审核 approve -> approved + reviewedAt + reviewerName 留痕', async () => {
    const r = await call('POST', `/api/v1/orders/${freshOrderId}/review`, {
      token: pharmacist, body: { decision: 'approve', comment: '同意执行' },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('approved');
    expect(typeof r.data.reviewedAt).toBe('number');
    expect(r.data.reviewerName).toBe('药师丙');
  });

  it('nurse 执行确认 -> executed + executedAt 留痕', async () => {
    const r = await call('POST', `/api/v1/orders/${freshOrderId}/execute`, {
      token: nurse, body: { note: '床旁核对完成' },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('executed');
    expect(typeof r.data.executedAt).toBe('number');
  });

  it('nurse 生成执行单 -> slipNo 存在且 totalFeeCents=该单 feeCents(整数分)', async () => {
    const r = await call('POST', `/api/v1/orders/${freshOrderId}/execution-slip`, { token: nurse, body: {} });
    expect(r.httpStatus).toBe(200);
    expect(r.data.slipNo).toMatch(/^SLIP-CO-/);
    expect(r.data.totalFeeCents).toBe(FRESH_FEE_CENTS);
  });

  it('同批重复生成 -> 同一 slipNo 且 reused=true（幂等重打）', async () => {
    const first = await call('POST', `/api/v1/orders/${freshOrderId}/execution-slip`, { token: nurse, body: {} });
    const second = await call('POST', `/api/v1/orders/${freshOrderId}/execution-slip`, { token: nurse, body: {} });
    // 注意：上一 it 已生成首单；这里再连续两次，比较第二/第三次是否命中同一 slipNo
    expect(second.data.slipNo).toBe(first.data.slipNo);
    expect(second.data.reused).toBe(true);
  });
});

describe('P0-2 CPOE 状态机语义（打既有 seed 单，只读 409，可重跑）', () => {
  it('对已 approved 单再 review -> 409 非法状态跃迁', async () => {
    // freshOrderId 此刻已是 executed；改用 seed 的 ORD-CO-2（approved）
    const r = await call('POST', '/api/v1/orders/ORD-CO-2/review', {
      token: pharmacist, body: { decision: 'approve' },
    });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
    expect(String(r.raw.message)).toContain('非法状态跃迁');
  });

  it('对已 executed 单再 execute -> 409', async () => {
    const r = await call('POST', '/api/v1/orders/ORD-CO-3/execute', { token: nurse, body: {} });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });

  it('对已 executed 的 ORD-CO-3 生成执行单 -> 200 且 slipNo 存在', async () => {
    const r = await call('POST', '/api/v1/orders/ORD-CO-3/execution-slip', { token: nurse, body: {} });
    expect(r.httpStatus).toBe(200);
    expect(r.data.slipNo).toMatch(/^SLIP-CO-/);
  });

  it('对 rejected 单 review -> 409', async () => {
    const r = await call('POST', '/api/v1/orders/ORD-CO-4/review', {
      token: pharmacist, body: { decision: 'approve' },
    });
    expect(r.httpStatus).toBe(409);
    expect(r.code).toBe(40900);
  });
});

describe('P0-2 CPOE 成套医嘱原子性', () => {
  it('3 条里第 3 条 feeCents=1.5 -> 400 且医嘱总数未增（零落库）', async () => {
    const before = await call('GET', '/api/v1/orders/cpoe');
    const beforeN = Array.isArray(before.data) ? before.data.length : 0;
    const r = await call('POST', '/api/v1/orders/sets', {
      token: doctor,
      body: {
        visitId: 'VISIT-A100', setName: '原子性失败组',
        orders: [
          { orderType: 'medication', content: '原子A', feeCents: 100 },
          { orderType: 'lab', content: '原子B', feeCents: 200 },
          { orderType: 'exam', content: '原子C', feeCents: 1.5 },
        ],
      },
    });
    expect(r.httpStatus).toBe(400);
    expect(r.code).toBe(40000);
    const after = await call('GET', '/api/v1/orders/cpoe');
    const afterN = Array.isArray(after.data) ? after.data.length : 0;
    expect(afterN).toBe(beforeN); // 零落库直接证据
  });

  it('合法 set 3 条 -> orderIds.length===3 且 totalFeeCents=Σ', async () => {
    const r = await call('POST', '/api/v1/orders/sets', {
      token: doctor,
      body: {
        visitId: 'VISIT-B200', setName: '合法成套',
        orders: [
          { orderType: 'medication', content: '套药A', feeCents: 111 },
          { orderType: 'treatment', content: '套治疗B', feeCents: 222 },
          { orderType: 'nursing', content: '套护理C', feeCents: 333 },
        ],
      },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.orderIds.length).toBe(3);
    expect(r.data.totalFeeCents).toBe(111 + 222 + 333);
  });
});

describe('P0-2 CPOE 撤销', () => {
  it('医生新开一条 pending_review 后撤销 -> cancelled；对 approved 撤销 -> 409', async () => {
    const c = await call('POST', '/api/v1/orders', {
      token: doctor, body: { visitId: 'VISIT-A100', orderType: 'other', content: '待撤销单 ' + Date.now(), feeCents: 50 },
    });
    expect(c.data.status).toBe('pending_review');
    const canc = await call('POST', `/api/v1/orders/${c.data.orderId}/cancel`, {
      token: doctor, body: { reason: '开错了' },
    });
    expect(canc.data.status).toBe('cancelled');
    // 对已 approved 的 seed 单撤销 -> 409 仅待审核可撤
    const bad = await call('POST', '/api/v1/orders/ORD-CO-2/cancel', { token: doctor, body: { reason: 'x' } });
    expect(bad.httpStatus).toBe(409);
    expect(bad.code).toBe(40900);
  });
});
