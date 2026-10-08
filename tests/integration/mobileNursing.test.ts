/**
 * 健澜科技 jlmedaios - 移动护理 PDA 执行端闭环 集成测试（M16-A）
 *
 * 直连真实 PostgreSQL（无 mock），覆盖 PDA 床旁核心闭环：
 *  - 权限：护士具备 mobile_nursing:execute；
 *  - 床位看板在列；扫腕带定位患者；
 *  - 扫药 -> 五重核对：错患者 409 / 匹配给药成功（高风险双人核对）；
 *  - 体征采集 / 任务执行 / Braden 高风险评分 / 护理记录 / SBAR 草稿与签名；
 *  - 医生给药 403；路由未认证 401；任务不存在 404。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除本测试 M16A_TEST 标签夹具，绝不全表删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit, updateVisit } from '../../src/db/repositories/visitRepo.js';
import { createInpatientOrder, reviewOrder } from '../../src/db/repositories/orderRepo.js';
import {
  buildSbar,
  captureVitals,
  createBedsideRecord,
  executeBedsideTask,
  getBedBoard,
  MobileVerifyError,
  saveAssessment,
  scanAndAdminister,
  scanCode,
  signSbar,
} from '../../src/bff/aggregators/mobileNursingAggregator.js';
import { createCareTask } from '../../src/bff/aggregators/inpatientCareAggregator.js';
import { mobileNursingRoutes } from '../../src/bff/routes/mobileNursing.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let nurseMa: AuthView;
let nurseSun: AuthView;
let doctorLin: AuthView;

const TAG = 'M16A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newFixtureVisit() {
  const patient = await createPatient({
    mrn: `M16A${seq()}`,
    nameMasked: `P*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1958-05-05',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: '急诊科',
    chiefComplaint: '移动护理闭环测试',
  });
  await updateVisit(visit.id, { bedNo: 'M16床' });
  return { patient, visit };
}

async function newActiveDrugOrder(visitId: string, drugCode: string, dose: string, requiresDoubleCheck = false) {
  const order = await createInpatientOrder({
    visitId, orderType: 'drug', content: `移动测试药 ${dose} 口服`,
    detail: { drugCode, dose }, category: 'short_term', doctorId: admin.id,
    requiresDoubleCheck,
  });
  const reviewed = await reviewOrder(order.id, admin.id);
  if (!reviewed) throw new Error('医嘱审核失败');
  return reviewed;
}

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
  nurseMa = await load('nurse_ma');
  nurseSun = await load('nurse_sun');
  doctorLin = await load('doctor_lin');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.order_administrations a
      USING clinical.orders o, clinical.visits vi, clinical.patients p
      WHERE a.order_id = o.id AND o.visit_id = vi.id AND vi.patient_id = p.id
        AND p.tags @> '["M16A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.nursing_records r
      USING clinical.visits vi, clinical.patients p
      WHERE r.visit_id = vi.id AND vi.patient_id = p.id AND p.tags @> '["M16A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.nursing_tasks t
      USING clinical.visits vi, clinical.patients p
      WHERE t.visit_id = vi.id AND vi.patient_id = p.id AND p.tags @> '["M16A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.orders o
      USING clinical.visits vi, clinical.patients p
      WHERE o.visit_id = vi.id AND vi.patient_id = p.id AND p.tags @> '["M16A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits vi USING clinical.patients p
      WHERE vi.patient_id = p.id AND p.tags @> '["M16A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M16A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M16-A 移动护理 PDA 闭环（真实 PostgreSQL）', () => {
  it('环境就绪：护士/医师具备移动护理执行权限', () => {
    expect(dbAvailable).toBe(true);
    expect(nurseMa.permissions).toContain('mobile_nursing:execute');
    expect(doctorLin.permissions).toContain('mobile_nursing:execute');
    expect(admin.permissions).toContain('mobile_nursing:execute');
  });

  it('床位看板：本科室在院患者在列并带待办/风险字段', async () => {
    const { visit } = await newFixtureVisit();
    const board = await getBedBoard(nurseMa);
    const mine = board.items.find((i) => i.visitId === visit.id);
    expect(mine).toBeDefined();
    // 看板来自 ADT 在院读模型；这里只断言在列且带待办/风险富化字段（床号由 ADT 流程维护）
    expect(mine).toHaveProperty('pendingTaskCount');
    expect(mine).toHaveProperty('fallRisk');
  });

  it('扫腕带定位患者；未知条码 400', async () => {
    const { visit, patient } = await newFixtureVisit();
    const res = await scanCode(nurseMa, visit.visitNo);
    expect(res.kind).toBe('wristband');
    expect(res.visitId).toBe(visit.id);
    expect(res.patientName).toBe(patient.nameMasked);
    await expect(scanCode(nurseMa, 'ZZZ999')).rejects.toMatchObject({ status: 400 });
  });

  it('扫药结合就诊定位 active 医嘱', async () => {
    const { visit } = await newFixtureVisit();
    await newActiveDrugOrder(visit.id, 'D001', '100mg');
    const res = await scanCode(nurseMa, 'D001', visit.id);
    expect(res.kind).toBe('drug');
    expect(res.resolvable).toBe(true);
    expect(res.order?.content).toContain('移动测试药');
  });

  it('五重核对：错患者 409 / 匹配给药成功', async () => {
    const { visit, patient } = await newFixtureVisit();
    const order = await newActiveDrugOrder(visit.id, 'D001', '100mg');

    // 错患者 → MobileVerifyError 409
    await expect(
      scanAndAdminister(nurseMa, order.id, {
        bedNo: 'M16床', patientName: '错误姓名', drugCode: 'D001', dose: '100mg',
      }),
    ).rejects.toMatchObject({ status: 409 });
    // 确认错误类型携带 mismatches
    try {
      await scanAndAdminister(nurseMa, order.id, {
        bedNo: 'M16床', patientName: '错误姓名', drugCode: 'D001', dose: '100mg',
      });
      throw new Error('应当抛出 MobileVerifyError');
    } catch (e) {
      expect(e instanceof MobileVerifyError).toBe(true);
      expect((e as MobileVerifyError).checks.mismatches.length).toBeGreaterThan(0);
    }

    // 匹配 → 给药成功
    const ok = await scanAndAdminister(nurseMa, order.id, {
      bedNo: 'M16床', patientName: patient.nameMasked, drugCode: 'D001', dose: '100mg',
    });
    expect(ok.administration.orderId).toBe(order.id);
  });

  it('高风险药：缺双人核对 400 / 双人核对成功', async () => {
    const { visit, patient } = await newFixtureVisit();
    const order = await newActiveDrugOrder(visit.id, 'D002', '0.4ml', true);

    // 高风险药未填 checkedBy → 400
    await expect(
      scanAndAdminister(nurseMa, order.id, {
        bedNo: 'M16床', patientName: patient.nameMasked, drugCode: 'D002', dose: '0.4ml',
      }),
    ).rejects.toMatchObject({ status: 400 });

    // 第二护士双人核对 → 成功
    const ok = await scanAndAdminister(nurseMa, order.id, {
      bedNo: 'M16床', patientName: patient.nameMasked, drugCode: 'D002', dose: '0.4ml',
      checkedBy: nurseSun.id,
    });
    expect(ok.administration.checkedBy).toBe(nurseSun.id);
  });

  it('体征采集落护理记录', async () => {
    const { visit } = await newFixtureVisit();
    const rec = await captureVitals(nurseMa, {
      visitId: visit.id,
      vitals: { temp: 36.6, pulse: 78, resp: 18, sbp: 120, dbp: 80, spo2: 98, glucose: 5.4 },
    });
    expect(rec.visitId).toBe(visit.id);
    expect(rec.vitals.temp).toBe(36.6);
  });

  it('护理任务：创建 -> 床旁执行 done', async () => {
    const { visit } = await newFixtureVisit();
    const task = await createCareTask(nurseMa, {
      visitId: visit.id, taskType: 'vitals', content: '测血压',
      idempotencyKey: `M16A-${seq()}`,
    });
    const done = await executeBedsideTask(nurseMa, task.id, '血压 120/80');
    expect(done.task.status).toBe('done');
    expect(done.task.result).toBe('血压 120/80');
  });

  it('Braden 高风险评分落护理记录', async () => {
    const { visit } = await newFixtureVisit();
    const rec = await saveAssessment(nurseMa, {
      visitId: visit.id, type: 'braden',
      answers: { sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 },
    });
    expect(rec.pressureSoreRisk).toBe('high');
    expect((rec.riskAssessment as { braden: { score: number } }).braden.score).toBe(6);
  });

  it('床旁护理记录录入', async () => {
    const { visit } = await newFixtureVisit();
    const rec = await createBedsideRecord(nurseMa, {
      visitId: visit.id, measures: '患者神志清楚，宣教已完成', voiceText: '语音转写补充', aiAssisted: true,
    });
    expect(rec.measures).toContain('患者神志清楚');
    expect(rec.aiAssisted).toBe(true);
  });

  it('SBAR 草稿 -> 本人签名落库', async () => {
    const { visit } = await newFixtureVisit();
    const draft = await buildSbar(nurseMa, { dept: '急诊科', shift: 'day' });
    expect(draft.sections).toHaveProperty('S');
    const signed = await signSbar(nurseMa, {
      visitId: visit.id, shift: 'day',
      sections: { S: '在院交班', B: '诊断', A: '平稳', R: '续观' },
    });
    expect(signed.status).toBe('signed');
    expect(signed.signedBy).toBe(nurseMa.id);
  });

  it('医生给药 403（职责分离）', async () => {
    const { visit, patient } = await newFixtureVisit();
    const order = await newActiveDrugOrder(visit.id, 'D009', '5mg');
    await expect(
      scanAndAdminister(doctorLin, order.id, {
        bedNo: 'M16床', patientName: patient.nameMasked, drugCode: 'D009', dose: '5mg',
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('路由：未认证 401；任务不存在 404', async () => {
    const route = mobileNursingRoutes.find((r) => r.path === '/api/v1/m/tasks/:id/execute')!;
    const denied = await route.handle(makeCtx(null));
    expect(denied.status).toBe(401);
    const ctx = Object.assign(makeCtx({ id: admin.id }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    const r404 = await route.handle(ctx);
    expect(r404.status).toBe(404);
  });
});
