/**
 * 健澜AI原生医院操作系统OS - P0 交易四切片端到端集成测试（真实 HTTP 打本机 BFF 8080）
 *
 * 覆盖四条主链路：门诊挂号闭环 / 护士站医嘱执行闭环 / 药房发药退药闭环 / 住院押金出院结算闭环。
 * DEMO_MODE=1、无 PostgreSQL；用 bun 内置 fetch 打运行态 BFF，证明路由能跑通业务。
 *
 * 工程约束：
 * - 不引入第三方依赖；不改聚合器/路由逻辑；不新增 auth:false 路由；金额一律整数分。
 * - 每条 it 至少断言一项业务返回值（refundCents/balanceCents/slipNo/totalCents/shortfallCents 等），
 *   不只断言状态码。
 * - POST 不带 Idempotency-Key（中间件对缺失 key 直通 handler）。
 *
 * 幂等性说明（重要）：
 * 本测试为「种子消耗型」集成测试，不可幂等重跑：
 *   - 护士站链消耗 ORD-1001（执行终态）并把 ORD-1002 审核通过留作 approved；
 *   - 押金链将 VISIT-C300 结算为 settled 终态（此后再缴预交金/再结算均 409）。
 * 门诊链（唯一 slotId）与药房链（唯一 deptCode，且退药审批后医嘱回 approved）本身可重复跑，
 * 但护士站与押金链不具备可重跑性，故整体不可幂等。
 * 恢复方式：重启 BFF（模块加载时 seedDemoOrders/seedDemoAccounts 重新播种）。本轮按纪律不重启。
 *
 * 运行态口径提醒：
 *   E2E 打的是 13:04 启动的运行态旧进程，其 admissionAt 仍为旧硬编码 T0；
 *   故对 GET /warning 只断言结构与 level 枚举，不断言 daysCovered/avgDailyCostCents 区间
 *   （区间口径由 tests/unit/inpatientDepositSettle.test.ts 覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeAll, describe, expect, it } from 'bun:test';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';

interface CallResult {
  httpStatus: number;
  data: any;
  raw: any;
}

/** 统一 HTTP 调用：带 demo admin 头；非 2xx 也返回 body，便于断言 409。 */
async function call(method: string, path: string, body?: unknown): Promise<CallResult> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Authorization': 'Bearer jt-e2e-admin',
      'Content-Type': 'application/json',
    },
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
  const res = await fetch(BASE + '/health', {
    headers: { 'Authorization': 'Bearer jt-e2e-admin' },
  });
  if (res.status !== 200) {
    throw new Error('BFF 未就绪：请先启动 bun run src/bff/server.ts（DEMO_MODE=1）');
  }
});

// ---------------------------------------------------------------------------
// a) 门诊挂号闭环：预占 -> 挂号 -> 退号申请 -> 退号审批 -> 队列 -> 非法跃迁 409
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
// b) 护士站：待审 -> 审核 -> PDA 双匹配执行 -> 执行单 -> 已执行列表；腕带不匹配 409
// ---------------------------------------------------------------------------
describe('P0 交易四切片 - 护士站医嘱执行闭环', () => {
  let mainOrder: any = null;
  let secondOrder: any = null;

  beforeAll(async () => {
    const r = await call('GET', '/api/v1/nurse-station/pending-review');
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(1);
    mainOrder = r.data[0];
    secondOrder = r.data.length >= 2 ? r.data[1] : null;
  });

  it('待审核列表非空且取到首条 pending_review 医嘱', () => {
    expect(mainOrder).toBeTruthy();
    expect(mainOrder.status).toBe('pending_review');
    expect(mainOrder.orderId).toBeTruthy();
    expect(mainOrder.patientId).toBeTruthy();
  });

  it('医嘱审核通过状态变为 approved', async () => {
    const r = await call('POST', `/api/v1/nurse-station/orders/${mainOrder.orderId}/review`, {
      decision: 'approve',
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('approved');
  });

  it('PDA 床边腕带+医嘱双匹配执行成功状态 executed', async () => {
    const r = await call('POST', `/api/v1/nurse-station/orders/${mainOrder.orderId}/execute`, {
      wristband: {
        patientId: mainOrder.patientId,
        scannedPatientId: mainOrder.patientId,
        scannedOrderId: mainOrder.orderId,
      },
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.status).toBe('executed');
  });

  it('生成执行单含 slipNo 且两项核对均为 true', async () => {
    const r = await call('POST', `/api/v1/nurse-station/orders/${mainOrder.orderId}/execution-slip`);
    expect(r.httpStatus).toBe(200);
    expect(r.data.slipNo).toBeTruthy();
    expect(r.data.checks.patientMatched).toBe(true);
    expect(r.data.checks.orderMatched).toBe(true);
  });

  it('已执行列表包含本 orderId', async () => {
    const r = await call('GET', '/api/v1/nurse-station/executed-orders');
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.some((x: any) => x.orderId === mainOrder.orderId)).toBe(true);
  });

  it('腕带患者不匹配时执行 -> 409 腕带与患者不匹配', async () => {
    expect(secondOrder).toBeTruthy();
    const rev = await call('POST', `/api/v1/nurse-station/orders/${secondOrder.orderId}/review`, {
      decision: 'approve',
    });
    expect(rev.httpStatus).toBe(200);
    const ex = await call('POST', `/api/v1/nurse-station/orders/${secondOrder.orderId}/execute`, {
      wristband: {
        patientId: secondOrder.patientId,
        scannedPatientId: 'PT-WRONG-PATIENT',
        scannedOrderId: secondOrder.orderId,
      },
    });
    expect(ex.httpStatus).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// c) 药房：摆药批次 -> 完成 -> 双人发药 -> 退药申请 -> 退药审批；同人签名 409
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
// d) 住院押金与出院结算：缴押金 -> 查询 -> 预警 -> 结算 -> 重复结算 409
//    本测试消耗种子账户 VISIT-C300（结算为 settled 终态）。
// ---------------------------------------------------------------------------
describe('P0 交易四切片 - 住院押金与出院结算闭环', () => {
  const VISIT_ID = 'VISIT-C300'; // 种子第3条：deposit 60000 / consumed 120000
  const EXPECTED_DEPOSIT = 50000;

  let depositNo = '';

  it('缴纳预交金返回 depositNo，balanceCents = depositCents - consumedCents', async () => {
    const r = await call('POST', '/api/v1/inpatient/deposit-settle/deposits', {
      visitId: VISIT_ID,
      amountCents: EXPECTED_DEPOSIT,
      payMethod: 'cash',
    });
    expect(r.httpStatus).toBe(200);
    expect(r.data.depositNo).toBeTruthy();
    expect(Number.isInteger(r.data.balanceCents)).toBe(true);
    // 种子 consumedCents=120000；缴纳后 depositCents=110000；balance=-10000
    expect(r.data.depositCents).toBe(60000 + EXPECTED_DEPOSIT);
    expect(r.data.balanceCents).toBe(r.data.depositCents - 120000);
    depositNo = r.data.depositNo;
  });

  it('按 visitId 查询押金记录包含刚缴纳的 depositNo', async () => {
    const r = await call('GET', `/api/v1/inpatient/deposit-settle/deposits/${VISIT_ID}`);
    expect(r.httpStatus).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.some((x: any) => x.depositNo === depositNo)).toBe(true);
  });

  it('押金预警 level 合法且 balanceCents 为整数', async () => {
    const r = await call('GET', `/api/v1/inpatient/deposit-settle/warning/${VISIT_ID}`);
    expect(r.httpStatus).toBe(200);
    expect(['ok', 'warn', 'critical']).toContain(r.data.level);
    expect(Number.isInteger(r.data.balanceCents)).toBe(true);
    // 注：运行态 BFF 为 13:04 启动的旧进程，admissionAt 仍为旧硬编码 T0，
    // daysCovered/avgDailyCostCents 为失真值；区间口径由单测覆盖，此处不断言。
  });

  it('出院结算 totalCents = Σ(quantity×unitPriceCents)，shortfallCents 补足差额', async () => {
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
    // 结算时 depositCents=110000、consumedCents=120000、total=42000
    // balance = 110000 - 120000 - 42000 = -52000 -> shortfall 52000、refund 0
    expect(r.data.refundCents).toBe(0);
    expect(r.data.shortfallCents).toBe(52000);
    expect(Number.isInteger(r.data.shortfallCents)).toBe(true);
  });

  it('重复结算同一 visitId -> 409 该住院已结算', async () => {
    const r = await call('POST', '/api/v1/inpatient/deposit-settle/settlements', {
      visitId: VISIT_ID,
      items: [{ name: '再次结算', quantity: 1, unitPriceCents: 1000 }],
    });
    expect(r.httpStatus).toBe(409);
  });
});
