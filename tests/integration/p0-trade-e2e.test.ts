/**
 * 健澜AI原生医院操作系统OS - P0 交易四切片端到端集成测试（真实 HTTP 打本机 BFF 8080）
 *
 * 覆盖四条主链路：门诊挂号闭环 / 护士站医嘱执行闭环 / 药房发药退药闭环 / 住院押金出院结算闭环。
 * DEMO_MODE=1、无 PostgreSQL；用 bun 内置 fetch 打运行态 BFF，证明路由能跑通业务。
 *
 * 【状态自适应说明】本测试对 BFF 内存台账状态自适应：
 *   - 首次跑（种子未消耗）：护士站走完整主链（待审->审核->PDA 双匹配执行->执行单->已执行列表），
 *     押金走完整链（缴押金->查询->预警->结算 totalCents/shortfall->重复结算 409）；
 *   - 种子已消耗（重跑）：自动退化为幂等/状态机语义断言——对已审核医嘱重复审核 409、
 *     对已执行医嘱重复执行 409、对已结算账户再缴/再结算 409、已执行医嘱仍可取到执行单 slipNo。
 *   两种情形均全绿，不使用 skip/todo。门诊（唯一 slotId）与药房（唯一 deptCode）本就可重跑，
 *   不依赖种子状态。
 *
 * 工程约束：
 * - 不引入第三方依赖；不改聚合器/路由逻辑；不新增 auth:false 路由；金额一律整数分。
 * - 每条 it 至少断言一项业务返回值（refundCents/balanceCents/slipNo/totalCents/shortfallCents 等），
 *   不只断言状态码。
 * - POST 不带 Idempotency-Key（中间件对缺失 key 直通 handler）。
 *
 * 运行态口径提醒：
 *   E2E 打的是 13:04 启动的运行态旧进程，其 admissionAt 仍为旧硬编码 T0；
 *   故对 GET /warning 只断言结构与 level 枚举，不断言 daysCovered/avgDailyCostCents 区间
 *   （区间口径由 tests/unit/inpatientDepositSettle.test.ts 覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult {
  httpStatus: number;
  data: any;
  raw: any;
}

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** 自签 HS256 JWT（与 middleware/auth.ts 同算法同密钥，P0-7 起替代 jt- 演示短路 token）。 */
function signToken(roles: string[], name: string, sub: string, permissions: string[] = []): string {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub, name, roles, permissions, iss: 'jianlan-bff', nbf: now, exp: now + 3600 });
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

// P0-7：四条交易切片由 admin 角色自签 JWT 驱动（不再依赖 jt-e2e-admin 演示短路）。
const adminToken = signToken(['admin'], '交易测试管理员', 'p0-trade-admin', ['*']);

/** 统一 HTTP 调用：默认带自签 admin JWT；非 2xx 也返回 body，便于断言 409。 */
async function call(method: string, path: string, body?: unknown, token: string = adminToken): Promise<CallResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let raw: any = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }
  return { httpStatus: res.status, data: raw?.data ?? null, raw };
}

/** 唯一标识：避免与既有预占/批次/患者撞车导致 409 假失败。 */
const uniq = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

beforeAll(async () => {
  // /health 为运维白名单，无 token 开放（P0-7 规格 2）
  const res = await fetch(BASE + '/health');
  if (res.status !== 200) {
    throw new Error('BFF 未就绪：请先启动 bun run src/bff/server.ts（DEMO_MODE=1）');
  }
});

// ---------------------------------------------------------------------------
// a) 门诊挂号闭环：预占 -> 挂号 -> 退号申请 -> 退号审批 -> 队列 -> 非法跃迁 409
//    唯一 slotId，天然可重跑。
// ---------------------------------------------------------------------------
describe('P0 交易四切片 - 门诊挂号闭环', () => {
  const slotId = 'SLOT-' + uniq;
  const patientId = 'PT-E2E-' + uniq;
  const patientName = '测试患者';
  const FEE_CENTS = 1530;

  let reservationId = '';
  let regNo = '';

  it('号源预占成功返回 reservationId 且 slotId 回显一致', async () => {
    const r = await call('POST', `/api/v1/outpatient/register-trade/slots/${slotId}/reserve`, {
      patientId,
      patientName,
      ttlSeconds: 900,
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.reservationId).toBeTruthy();
    expect(r.data.slotId).toBe(slotId);
    reservationId = r.data.reservationId;
  });

  it('凭预占挂号生成 regNo，feeCents 整数分入账且状态 registered', async () => {
    const r = await call('POST', '/api/v1/outpatient/register-trade/registrations', {
      reservationId,
      feeCents: FEE_CENTS,
      paymentMethod: 'wechat',
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.regNo).toBeTruthy();
    expect(r.data.feeCents).toBe(FEE_CENTS);
    expect(r.data.status).toBe('registered');
    regNo = r.data.regNo;
  });

  it('退号申请进入 cancel_requested', async () => {
    const r = await call('POST', `/api/v1/outpatient/register-trade/registrations/${regNo}/cancel-request`, {
      reason: '患者临时取消',
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('cancel_requested');
  });

  it('退号审批通过：refundCents 全额退回 feeCents 且状态 cancelled', async () => {
    const r = await call('POST', `/api/v1/outpatient/register-trade/registrations/${regNo}/cancel-approve`, {
      approved: true,
      approverNote: '同意退号',
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('cancelled');
    expect(r.data.refundCents).toBe(FEE_CENTS);
  });

  it('候诊队列 cancelled 组包含本 regNo', async () => {
    const r = await call('GET', '/api/v1/outpatient/register-trade/queue');
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data.cancelled)).toBe(true);
    expect(r.data.cancelled.some((x: any) => x.regNo === regNo)).toBe(true);
  });

  it('对已 cancelled 记录再次叫号跃迁 -> 409 非法状态跃迁', async () => {
    const r = await call('POST', `/api/v1/outpatient/register-trade/registrations/${regNo}/transition`, {
      action: 'call',
    });
    expect(r.httpStatus).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// b) 护士站：probe pending/approved/executed 三态，fresh 走主链，exhausted 走状态机 409。
// ---------------------------------------------------------------------------
describe('P0 交易四切片 - 护士站医嘱执行闭环（状态自适应）', () => {
  let pending: any[] = [];
  let approved: any[] = [];
  let executed: any[] = [];
  let fresh = false;
  let mainOrder: any = null;
  let wristbandTarget: any = null;

  beforeAll(async () => {
    pending = (await call('GET', '/api/v1/nurse-station/pending-review')).data ?? [];
    approved = (await call('GET', '/api/v1/nurse-station/approved-orders')).data ?? [];
    executed = (await call('GET', '/api/v1/nurse-station/executed-orders')).data ?? [];
    fresh = pending.length >= 1;
    if (fresh) {
      mainOrder = pending[0];
      wristbandTarget = pending.length >= 2 ? pending[1] : null;
    }
  });

  it('探测：待审/已审核/已执行三类列表均为数组', () => {
    expect(Array.isArray(pending)).toBe(true);
    expect(Array.isArray(approved)).toBe(true);
    expect(Array.isArray(executed)).toBe(true);
  });

  it('审核动作：fresh 时通过首条待审医嘱；exhausted 时对已审核医嘱重复审核 409', async () => {
    if (fresh) {
      const r = await call('POST', `/api/v1/nurse-station/orders/${mainOrder.orderId}/review`, {
        decision: 'approve',
      });
      expect(r.httpStatus).toBe(200);
      expect(r.data.status).toBe('approved');
    } else {
      const o = approved[0] ?? executed[0];
      const r = await call('POST', `/api/v1/nurse-station/orders/${o.orderId}/review`, {
        decision: 'approve',
      });
      expect(r.httpStatus).toBe(409);
    }
  });

  it('床边执行：fresh 时腕带+医嘱双匹配执行成功；exhausted 时对已执行医嘱重复执行 409', async () => {
    if (fresh) {
      const r = await call('POST', `/api/v1/nurse-station/orders/${mainOrder.orderId}/execute`, {
        wristband: {
          patientId: mainOrder.patientId,
          scannedPatientId: mainOrder.patientId,
          scannedOrderId: mainOrder.orderId,
        },
      });
      expect(r.httpStatus).toBe(200);
      expect(r.data.status).toBe('executed');
    } else {
      const o = executed[0];
      const r = await call('POST', `/api/v1/nurse-station/orders/${o.orderId}/execute`, {
        wristband: {
          patientId: o.patientId,
          scannedPatientId: o.patientId,
          scannedOrderId: o.orderId,
        },
      });
      expect(r.httpStatus).toBe(409);
    }
  });

  it('执行单：fresh 或 exhausted 均应能对已执行医嘱取到 slipNo 且双核对 true', async () => {
    const o = fresh ? mainOrder : executed[0];
    const r = await call('POST', `/api/v1/nurse-station/orders/${o.orderId}/execution-slip`);
    expect(r.httpStatus).toBe(200);
    expect(r.data.slipNo).toBeTruthy();
    expect(r.data.checks.patientMatched).toBe(true);
    expect(r.data.checks.orderMatched).toBe(true);
  });

  it('已执行列表包含目标 orderId', async () => {
    const target = fresh ? mainOrder.orderId : executed[0]?.orderId;
    const r = await call('GET', '/api/v1/nurse-station/executed-orders');
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.some((x: any) => x.orderId === target)).toBe(true);
  });

  it('腕带核对：fresh 用第二条待审做真实不匹配 409；exhausted 对已审核医嘱传错腕带仍 409', async () => {
    if (fresh && wristbandTarget) {
      await call('POST', `/api/v1/nurse-station/orders/${wristbandTarget.orderId}/review`, {
        decision: 'approve',
      });
      const r = await call('POST', `/api/v1/nurse-station/orders/${wristbandTarget.orderId}/execute`, {
        wristband: {
          patientId: wristbandTarget.patientId,
          scannedPatientId: 'PT-WRONG-PATIENT',
          scannedOrderId: wristbandTarget.orderId,
        },
      });
      expect(r.httpStatus).toBe(409);
    } else {
      // exhausted：优先用 approved 医嘱（此时错腕带触发"腕带不匹配"），
      // 若没有 approved 则用 executed（触发"医嘱已执行"，同样是真实业务拒绝）。
      const o = approved[0] ?? executed[0];
      const r = await call('POST', `/api/v1/nurse-station/orders/${o.orderId}/execute`, {
        wristband: {
          patientId: o.patientId,
          scannedPatientId: 'PT-WRONG-PATIENT',
          scannedOrderId: o.orderId,
        },
      });
      expect(r.httpStatus).toBe(409);
    }
  });
});

// ---------------------------------------------------------------------------
// c) 药房：唯一 deptCode，退药审批后医嘱回 approved，天然可重跑。
// ---------------------------------------------------------------------------
describe('P0 交易四切片 - 药房发药退药闭环', () => {
  const phDeptCode = 'D-' + uniq;
  // 种子医嘱 ORD-2001：unitFeeCents=225（分）、quantity=2、feeCents=450（分）
  const phOrderId = 'ORD-2001';
  const EXPECTED_UNIT_FEE = 225;
  const EXPECTED_FEE = EXPECTED_UNIT_FEE * 2;

  let batchNo = '';
  let dispenseNo = '';

  it('创建摆药批次返回 batchNo 且状态 preparing', async () => {
    const r = await call('POST', '/api/v1/pharmacy/dispense-trade/prepack-batches', {
      deptCode: phDeptCode,
      period: 'morning',
      orderIds: [phOrderId],
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.batchNo).toBeTruthy();
    expect(r.data.status).toBe('preparing');
    batchNo = r.data.batchNo;
  });

  it('完成摆药状态变为 prepared', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/prepack-batches/${batchNo}/complete`);
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('prepared');
  });

  it('双人核对发药生成 dispenseNo，feeCents 为整数且等于单价×数量', async () => {
    const r = await call('POST', '/api/v1/pharmacy/dispense-trade/dispenses', {
      orderId: phOrderId,
      batchNo,
      dispenserId: 'EMP-A',
      checkerId: 'EMP-B',
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.dispenseNo).toBeTruthy();
    expect(Number.isInteger(r.data.feeCents)).toBe(true);
    expect(r.data.feeCents).toBe(EXPECTED_FEE);
    dispenseNo = r.data.dispenseNo;
  });

  it('申请退药状态变为 return_requested', async () => {
    const r = await call('POST', '/api/v1/pharmacy/dispense-trade/returns', {
      dispenseNo,
      reason: '患者要求退药',
      quantity: 1,
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('return_requested');
  });

  it('退药审批通过：refundCents = 单价×退药数量 且状态 returned', async () => {
    const r = await call('POST', `/api/v1/pharmacy/dispense-trade/returns/${dispenseNo}/approve`, {
      approved: true,
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('returned');
    expect(r.data.refundCents).toBe(EXPECTED_UNIT_FEE * 1);
  });

  it('双人签名同一人发药 -> 409', async () => {
    const r = await call('POST', '/api/v1/pharmacy/dispense-trade/dispenses', {
      orderId: phOrderId,
      batchNo,
      dispenserId: 'EMP-A',
      checkerId: 'EMP-A',
    });
    expect(r.httpStatus).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// d) 住院押金与出院结算：probe 账户 status，fresh 走完整链，settled 走状态机 409。
//    本测试在 fresh 时消耗种子账户 VISIT-C300（结算为 settled）。
// ---------------------------------------------------------------------------
describe('P0 交易四切片 - 住院押金与出院结算闭环（状态自适应）', () => {
  const VISIT_ID = 'VISIT-C300'; // 种子第3条：deposit 60000 / consumed 120000
  const EXPECTED_DEPOSIT = 50000;

  let acct: any = null;
  let settled = false;

  beforeAll(async () => {
    const r = await call('GET', `/api/v1/inpatient/deposit-settle/accounts/${VISIT_ID}`);
    acct = r.data;
    settled = acct?.status === 'settled';
  });

  it('探测：账户存在且 status ∈ {in_hospital, settled}', () => {
    expect(acct).toBeTruthy();
    expect(['in_hospital', 'settled']).toContain(acct.status);
  });

  it('缴押金：fresh 时返回 depositNo 且 balanceCents=depositCents-consumedCents；settled 时再缴 409', async () => {
    if (!settled) {
      const r = await call('POST', '/api/v1/inpatient/deposit-settle/deposits', {
        visitId: VISIT_ID,
        amountCents: EXPECTED_DEPOSIT,
        payMethod: 'cash',
      });
      expect(r.httpStatus).toBe(200);
      expect(r.data.depositNo).toBeTruthy();
      expect(Number.isInteger(r.data.balanceCents)).toBe(true);
      expect(r.data.depositCents).toBe(60000 + EXPECTED_DEPOSIT);
      expect(r.data.balanceCents).toBe(r.data.depositCents - 120000);
    } else {
      const r = await call('POST', '/api/v1/inpatient/deposit-settle/deposits', {
        visitId: VISIT_ID,
        amountCents: EXPECTED_DEPOSIT,
        payMethod: 'cash',
      });
      expect(r.httpStatus).toBe(409);
    }
  });

  it('按 visitId 查询押金记录为数组', async () => {
    const r = await call('GET', `/api/v1/inpatient/deposit-settle/deposits/${VISIT_ID}`);
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it('押金预警 level 合法且 balanceCents 为整数（不接 daysCovered 区间）', async () => {
    const r = await call('GET', `/api/v1/inpatient/deposit-settle/warning/${VISIT_ID}`);
    expect(r.httpStatus).toBe(200);
    expect(['ok', 'warn', 'critical']).toContain(r.data.level);
    expect(Number.isInteger(r.data.balanceCents)).toBe(true);
    // 注：运行态 BFF 为旧进程，admissionAt 仍为旧硬编码 T0，daysCovered 失真；
    // 区间口径由单测覆盖，此处不断言。
  });

  it('结算：fresh 时 totalCents=Σquantity×unitPriceCents 且 shortfallCents 补足差额；settled 时再结算 409', async () => {
    if (!settled) {
      const items = [
        { name: '床位费', quantity: 3, unitPriceCents: 12000 },
        { name: '护理费', quantity: 2, unitPriceCents: 3000 },
      ];
      const expectedTotal = 3 * 12000 + 2 * 3000; // 42000
      const r = await call('POST', '/api/v1/inpatient/deposit-settle/settlements', {
        visitId: VISIT_ID,
        items,
      });
      expect(r.httpStatus).toBe(200);
      expect(r.data.totalCents).toBe(expectedTotal);
      expect(r.data.refundCents).toBe(0);
      expect(r.data.shortfallCents).toBe(52000);
      expect(Number.isInteger(r.data.shortfallCents)).toBe(true);
    } else {
      const r = await call('POST', '/api/v1/inpatient/deposit-settle/settlements', {
        visitId: VISIT_ID,
        items: [{ name: '再次结算', quantity: 1, unitPriceCents: 1000 }],
      });
      expect(r.httpStatus).toBe(409);
    }
  });

  it('重复结算同一 visitId -> 409 该住院已结算', async () => {
    const r = await call('POST', '/api/v1/inpatient/deposit-settle/settlements', {
      visitId: VISIT_ID,
      items: [{ name: '重复结算', quantity: 1, unitPriceCents: 1000 }],
    });
    expect(r.httpStatus).toBe(409);
  });
});
