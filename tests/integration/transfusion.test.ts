/**
 * 健澜科技 jlmedaios - 输血管理闭环 集成测试（M10-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 全链路：申请（CDS 指征留痕）→ 交叉配血 → 发血扣库存 → 双人核对输注 → 完成；
 *  - 幂等：同申请号重复申请只一条；库存扣减事务内完成；
 *  - 权限：医师申请、技师配血/发血、护士输注、质控复核分离；越权 403；
 *  - 状态机：非法转换 409；双人核对同人 400；库存不足 409 不扣库；
 *  - 不良反应：输注中/完成后上报成功，未输注 409；
 *  - 并发：同一申请并发发血只成功一次（行锁）；
 *  - BFF 路由信封：401 未认证 / 404 不存在 / 400 缺参。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  applyTransfusion,
  crossmatch,
  dispense,
  startTransfusion,
  completeTransfusion,
  stopTransfusion,
  cancelRequest,
  reportReaction,
  getTransfusion,
  listTransfusionsView,
} from '../../src/bff/aggregators/transfusionAggregator.js';
import { transfusionRoutes } from '../../src/bff/routes/transfusion.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let doctorLi: AuthView;
let nurse: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];
const visitIds: string[] = [];

/** 新建患者/住院就诊夹具，返回 {visitId, patientId}。 */
async function newVisitFixture(): Promise<{ visitId: string; patientId: string }> {
  const patient = await createPatient({
    mrn: `M10A${seq()}`,
    nameMasked: `输*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1972-08-08',
    tags: ['M10A_TEST'],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: '普外科',
    chiefComplaint: '外伤后失血',
  });
  visitIds.push(visit.id);
  return { visitId: visit.id, patientId: patient.id };
}

function applyBody(visitId: string, patientId: string, overrides: Record<string, unknown> = {}) {
  return {
    requestNo: `BT${seq()}`,
    visitId,
    patientId,
    department: '普外科',
    indication: '重度贫血 Hb 65 g/L，伴心悸乏力',
    indicationMeta: { hb: 65 },
    bloodType: 'O',
    component: 'red_cell',
    unitCount: 2,
    urgency: 'routine',
    ...overrides,
  };
}

/** 构造路由 Ctx（带 user）。 */
function makeCtx(user: { id: string; roles?: string[] } | null): Ctx {
  return {
    user: user ? { ...user, roles: user.roles ?? ['admin'], permissions: [] } : null,
    query: new URLSearchParams(),
    params: {} as Record<string, string>,
    body: async () => ({}),
    headers: new Headers(),
    method: 'GET',
    path: '/',
  } as unknown as Ctx;
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  doctorLi = await load('doctor_li');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 恢复已被发血扣减的库存（共享种子资源，测试后还原基线）。
    // 注意：必须先按 (blood_type, component, batch_no) 聚合 SUM(unit_count)，
    // 再 UPDATE...FROM 聚合行；否则多个申请对应同一 stock 行时，PostgreSQL
    // 对该行只更新一次（随机取一个 b 行），不会累加，导致库存少恢复。
    await db`
      UPDATE clinical.blood_stock s SET units = s.units + agg.total, updated_at = now()
      FROM (
        SELECT b.blood_type, b.component, b.batch_no, SUM(b.unit_count) AS total
        FROM clinical.blood_transfusion_requests b, clinical.visits v, clinical.patients p
        WHERE b.visit_id = v.id AND v.patient_id = p.id
          AND p.tags @> '["M10A_TEST"]'::jsonb
          AND b.status IN ('dispensed', 'transfusing', 'completed')
          AND b.batch_no IS NOT NULL
        GROUP BY b.blood_type, b.component, b.batch_no
      ) agg
      WHERE s.blood_type = agg.blood_type AND s.component = agg.component
        AND s.batch_no = agg.batch_no
    `;
    await db`
      DELETE FROM clinical.blood_transfusion_reactions r
      USING clinical.blood_transfusions t, clinical.blood_transfusion_requests b,
            clinical.visits v, clinical.patients p
      WHERE r.transfusion_id = t.id AND t.request_id = b.id
        AND b.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M10A_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.blood_transfusions t
      USING clinical.blood_transfusion_requests b, clinical.visits v, clinical.patients p
      WHERE t.request_id = b.id AND b.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M10A_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.blood_transfusion_requests b
      USING clinical.visits v, clinical.patients p
      WHERE b.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M10A_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M10A_TEST"]'::jsonb
    `;
    await db` DELETE FROM clinical.patients WHERE tags @> '["M10A_TEST"]'::jsonb `;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M10-A 输血管理闭环（真实 PostgreSQL）', () => {
  it('环境就绪：连接真实库并加载账号权限', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('blood:apply');
    expect(admin.permissions).toContain('blood:crossmatch');
    expect(admin.permissions).toContain('blood:dispense');
    expect(admin.permissions).toContain('blood:transfuse');
    expect(admin.permissions).toContain('blood:review');
    expect(doctorChen.permissions).toContain('blood:apply');
    expect(doctorChen.permissions).not.toContain('blood:crossmatch');
    expect(nurse.permissions).toContain('blood:transfuse');
    expect(nurse.permissions).not.toContain('blood:apply');
  });

  it('全链路：申请→配血→发血扣库→双人核对输注→完成', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const before = await getTransfusionStock('O', 'red_cell');
    const { req, created } = await applyTransfusion(doctorChen, applyBody(visitId, patientId));
    expect(created).toBe(true);
    expect(req.status).toBe('requested');
    expect((req.indicationMeta as { cds?: { suggestion?: string } }).cds?.suggestion).toContain('65');

    const matched = await crossmatch(req.id, admin, { result: 'ABO 相合', note: '次侧无凝集' });
    expect(matched.status).toBe('crossmatched');
    expect(matched.crossmatchedBy).toBe(admin.id);

    const d = await dispense(req.id, admin);
    expect(d.status).toBe('dispensed');
    expect(d.batchNo).toBe('RC-O-2026-001');
    const after = await getTransfusionStock('O', 'red_cell');
    expect(before - after).toBe(2);

    const started = await startTransfusion(req.id, nurse, { coSignBy: admin.id, dripRate: '20 滴/分' });
    expect(started.req.status).toBe('transfusing');
    expect(String(started.transfusion.transfused_by)).toBe(nurse.id);
    expect(String(started.transfusion.co_sign_by)).toBe(admin.id);

    const done = await completeTransfusion(req.id, nurse, { vitalSigns: { hr: 88, bp: '120/80' } });
    expect(done.status).toBe('completed');
  });

  it('幂等：同申请号重复申请只一条且不重复扣库', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const body = applyBody(visitId, patientId, { unitCount: 1 });
    const first = await applyTransfusion(doctorChen, body);
    expect(first.created).toBe(true);
    const second = await applyTransfusion(doctorChen, body);
    expect(second.created).toBe(false);
    expect(second.req.id).toBe(first.req.id);
    const list = await listTransfusionsView();
    expect(list.filter((r) => r.requestNo === body.requestNo).length).toBe(1);
  });

  it('参数校验：缺指征/非法血型/非法成分/剂量<=0 均 400', async () => {
    const { visitId, patientId } = await newVisitFixture();
    await expect(
      applyTransfusion(doctorChen, applyBody(visitId, patientId, { indication: '' })),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      applyTransfusion(doctorChen, applyBody(visitId, patientId, { bloodType: 'X' })),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      applyTransfusion(doctorChen, applyBody(visitId, patientId, { component: 'water' })),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 0 })),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('权限：护士申请 403、医师配血 403、无 review 上报 403', async () => {
    const { visitId, patientId } = await newVisitFixture();
    await expect(
      applyTransfusion(nurse, applyBody(visitId, patientId)),
    ).rejects.toMatchObject({ status: 403 });
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId));
    await expect(
      crossmatch(req.id, doctorChen, { result: '相合' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      reportReaction(req.id, doctorChen, { severity: 'mild', symptom: '皮疹', action: 'observe' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('状态机：未配血直接发血 409；取消后配血 409；完成后再停输 409', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 1 }));
    await expect(dispense(req.id, admin)).rejects.toMatchObject({ status: 409 });
    await cancelRequest(req.id, doctorChen, { reason: '患者转院' });
    expect(req.status).not.toBe('cancelled'); // req 是旧快照，取消结果在返回里
    await expect(
      crossmatch(req.id, admin, { result: '相合' }),
    ).rejects.toMatchObject({ status: 409 });

    const b2 = await newVisitFixture();
    const r2 = await applyTransfusion(doctorChen, applyBody(b2.visitId, b2.patientId, { unitCount: 1 }));
    await crossmatch(r2.req.id, admin, { result: '相合' });
    await dispense(r2.req.id, admin);
    await startTransfusion(r2.req.id, nurse, { coSignBy: admin.id });
    await completeTransfusion(r2.req.id, nurse);
    await expect(
      stopTransfusion(r2.req.id, nurse, { reason: '事后停输' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('双人核对：执行护士与核对护士同人 400', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 1 }));
    await crossmatch(req.id, admin, { result: '相合' });
    await dispense(req.id, admin);
    await expect(
      startTransfusion(req.id, nurse, { coSignBy: nurse.id }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('库存不足：需求超出可发库存 → 409 且不扣库', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const before = await getTransfusionStock('O', 'red_cell');
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 9999 }));
    await crossmatch(req.id, admin, { result: '相合' });
    await expect(dispense(req.id, admin)).rejects.toMatchObject({ status: 409 });
    const after = await getTransfusionStock('O', 'red_cell');
    expect(before - after).toBe(0);
  });

  it('不良反应：输注中/完成后可上报；未输注 409', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 1 }));
    await expect(
      reportReaction(req.id, admin, { severity: 'mild', symptom: '皮疹', action: 'observe' }),
    ).rejects.toMatchObject({ status: 409 });
    await crossmatch(req.id, admin, { result: '相合' });
    await dispense(req.id, admin);
    await startTransfusion(req.id, nurse, { coSignBy: admin.id });
    const { reaction } = await reportReaction(req.id, admin, {
      severity: 'moderate', symptom: '发热寒战', action: 'stop', outcome: '好转',
    });
    expect(String(reaction.severity)).toBe('moderate');
    const detail = await getTransfusion(req.id);
    expect(detail.reactions.length).toBe(1);
    expect(String(detail.reactions[0].symptom)).toContain('发热');
  });

  it('审计：全链路审计哈希链留痕（blood.* 动作）', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 1 }));
    await crossmatch(req.id, admin, { result: '相合' });
    await dispense(req.id, admin);
    await startTransfusion(req.id, nurse, { coSignBy: admin.id });
    await completeTransfusion(req.id, nurse);
    const db = getDb();
    const rows = await db`
      SELECT action FROM audit.audit_logs
      WHERE resource_type = 'transfusion' AND resource_id = ${req.id}
      ORDER BY created_at ASC`;
    const actions = rows.map((r) => r.action as string);
    expect(actions).toContain('blood.apply');
    expect(actions).toContain('blood.crossmatch');
    expect(actions).toContain('blood.dispense');
    expect(actions).toContain('blood.transfuse');
    expect(actions).toContain('blood.complete');
  });

  it('并发：同一申请并发发血只成功一次（行锁+库存扣一次）', async () => {
    const { visitId, patientId } = await newVisitFixture();
    const { req } = await applyTransfusion(doctorChen, applyBody(visitId, patientId, { unitCount: 1 }));
    await crossmatch(req.id, admin, { result: '相合' });
    const before = await getTransfusionStock('O', 'red_cell');
    const attempt = () =>
      dispense(req.id, admin)
        .then(() => 'ok')
        .catch((e: { status?: number }) => (e?.status === 409 ? 'conflict' : 'fail'));
    const results = await Promise.all([attempt(), attempt(), attempt()]);
    const ok = results.filter((r) => r === 'ok').length;
    const conflict = results.filter((r) => r === 'conflict').length;
    expect(ok).toBe(1);
    expect(conflict).toBe(2);
    const after = await getTransfusionStock('O', 'red_cell');
    expect(before - after).toBe(1);
  });

  it('路由：未认证 401；不存在详情 404；缺参 400', async () => {
    const denied = await transfusionRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const detailCtx = Object.assign(makeCtx({ id: admin.id, roles: ['admin'] }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    const r404 = await transfusionRoutes[2].handle(detailCtx);
    expect(r404.status).toBe(404);
    const adminCtx = Object.assign(makeCtx({ id: admin.id, roles: ['admin'] }), {
      body: async () => ({ requestNo: `BT${seq()}`, patientId: 'x' }),
    });
    const r400 = await transfusionRoutes[0].handle(adminCtx);
    expect(r400.status).toBe(400);
  });
});

/** 读取某血型某成分的可用库存总量（取证辅助）。 */
async function getTransfusionStock(bloodType: string, component: string): Promise<number> {
  const db = getDb();
  const rows = await db`
    SELECT COALESCE(SUM(units), 0)::float8 AS total
    FROM clinical.blood_stock WHERE blood_type = ${bloodType} AND component = ${component}`;
  return Number(rows[0].total);
}
