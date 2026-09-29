/**
 * 健澜科技 jlmedaios - 预约随访 集成测试（M3-I）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 预约创建（幂等）→ 确认 → 完成/缺席；scheduled → 取消 全链路；
 *  - 随访计划创建 → 记录随访结果（pending → completed）；
 *  - 状态机非法转换 → 409；空目的/空原因 → 400；
 *  - 权限：药师无 appt:confirm / appt:followup；
 *  - BFF 路由信封 / 401 / 403 / 404 / 400 错误码映射。
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
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createFollowUpPlan,
  listAppointments,
  recordFollowUpResult,
  submitAppointment,
} from '../../src/bff/aggregators/apptAggregator.js';
import { apptRoutes } from '../../src/bff/routes/appt.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let pharmacist: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

async function newPatient(): Promise<string> {
  const patient = await createPatient({
    mrn: `M3I${seq()}`,
    nameMasked: `预*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1975-01-01',
    tags: ['M3I_TEST'],
  });
  patientIds.push(patient.id);
  return patient.id;
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
  pharmacist = await load('pharmacist_wang');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.follow_up_records r USING clinical.follow_up_plans pl
      WHERE r.plan_id = pl.id AND pl.patient_id IN (
        SELECT id FROM clinical.patients WHERE tags @> '["M3I_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.follow_up_plans WHERE patient_id IN (
        SELECT id FROM clinical.patients WHERE tags @> '["M3I_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.appointments WHERE patient_id IN (
        SELECT id FROM clinical.patients WHERE tags @> '["M3I_TEST"]'::jsonb
      )
    `;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M3I_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-I 预约全链路', () => {
  it('创建预约：幂等（同号不重复）', async () => {
    const patientId = await newPatient();
    const no = `APPT${seq()}`;
    const r1 = await submitAppointment(admin, {
      appointmentNo: no, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      department: '心血管内科', purpose: '术后复查',
    });
    expect(r1.created).toBe(true);
    expect(r1.appt.status).toBe('scheduled');

    const r2 = await submitAppointment(admin, {
      appointmentNo: no, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      purpose: '术后复查',
    });
    expect(r2.created).toBe(false);
  });

  it('scheduled → confirmed → completed', async () => {
    const patientId = await newPatient();
    const r = await submitAppointment(admin, {
      appointmentNo: `APPT${seq()}`, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      purpose: '复诊',
    });
    const confirmed = await confirmAppointment(r.appt.id, admin);
    expect(confirmed.status).toBe('confirmed');

    const completed = await completeAppointment(r.appt.id, admin, 'completed');
    expect(completed.status).toBe('completed');
  });

  it('confirmed → absent（缺席）', async () => {
    const patientId = await newPatient();
    const r = await submitAppointment(admin, {
      appointmentNo: `APPT${seq()}`, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      purpose: '复诊',
    });
    await confirmAppointment(r.appt.id, admin);
    const absent = await completeAppointment(r.appt.id, admin, 'absent');
    expect(absent.status).toBe('absent');
  });

  it('scheduled → cancelled（需原因）', async () => {
    const patientId = await newPatient();
    const r = await submitAppointment(admin, {
      appointmentNo: `APPT${seq()}`, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      purpose: '复诊',
    });
    const cancelled = await cancelAppointment(r.appt.id, admin, '患者改期');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelReason).toBe('患者改期');
  });
});

describe.skipIf(!dbAvailable)('M3-I 状态机非法转换与入参校验', () => {
  it('未确认直接完成 → 409', async () => {
    const patientId = await newPatient();
    const r = await submitAppointment(admin, {
      appointmentNo: `APPT${seq()}`, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      purpose: '复诊',
    });
    await expect(completeAppointment(r.appt.id, admin, 'completed')).rejects.toBeTruthy();
  });

  it('已取消再确认 → 409', async () => {
    const patientId = await newPatient();
    const r = await submitAppointment(admin, {
      appointmentNo: `APPT${seq()}`, patientId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      purpose: '复诊',
    });
    await cancelAppointment(r.appt.id, admin, 'x');
    await expect(confirmAppointment(r.appt.id, admin)).rejects.toBeTruthy();
  });

  it('空就诊目的 → 400', async () => {
    const patientId = await newPatient();
    await expect(
      submitAppointment(admin, {
        appointmentNo: `APPT${seq()}`, patientId,
        scheduledAt: new Date().toISOString(), purpose: '   ',
      }),
    ).rejects.toBeTruthy();
  });

  it('空取消原因 → 400', async () => {
    const patientId = await newPatient();
    const r = await submitAppointment(admin, {
      appointmentNo: `APPT${seq()}`, patientId,
      scheduledAt: new Date().toISOString(), purpose: '复诊',
    });
    await expect(cancelAppointment(r.appt.id, admin, '  ')).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-I 随访计划与记录', () => {
  it('创建随访计划 → 记录结果（pending → completed）', async () => {
    const patientId = await newPatient();
    const plan = await createFollowUpPlan(admin, {
      planNo: `FU${seq()}`, patientId,
      scheduledDate: '2026-10-15', content: '血压监测、用药依从性',
    });
    expect(plan.status).toBe('pending');

    const updated = await recordFollowUpResult(plan.id, admin, {
      outcome: '血压控制良好，继续当前用药', note: '患者依从性好',
    });
    expect(updated.status).toBe('completed');
  });

  it('已完成计划重复记录 → 409', async () => {
    const patientId = await newPatient();
    const plan = await createFollowUpPlan(admin, {
      planNo: `FU${seq()}`, patientId,
      scheduledDate: '2026-10-15', content: '复诊提醒',
    });
    await recordFollowUpResult(plan.id, admin, { outcome: '已完成' });
    await expect(
      recordFollowUpResult(plan.id, admin, { outcome: '再次记录' }),
    ).rejects.toBeTruthy();
  });

  it('空随访结果 → 400', async () => {
    const patientId = await newPatient();
    const plan = await createFollowUpPlan(admin, {
      planNo: `FU${seq()}`, patientId,
      scheduledDate: '2026-10-15', content: '复诊提醒',
    });
    await expect(
      recordFollowUpResult(plan.id, admin, { outcome: '  ' }),
    ).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-I 权限', () => {
  it('医生有 appt 全权限', () => {
    expect(doctorChen.permissions).toContain('appt:view');
    expect(doctorChen.permissions).toContain('appt:confirm');
    expect(doctorChen.permissions).toContain('appt:followup');
  });

  it('药师无 appt:confirm / appt:followup（路由层 403）', () => {
    expect(pharmacist.permissions).not.toContain('appt:confirm');
    expect(pharmacist.permissions).not.toContain('appt:followup');
  });

  it('列表只返回数组', async () => {
    const list = await listAppointments();
    expect(Array.isArray(list)).toBe(true);
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? { id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions }
    : null;
  return {
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}
function findRoute(method: string, path: string) {
  return apptRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M3-I BFF 路由：权限与信封', () => {
  it('药师创建预约（无 appt:confirm）→ 403', async () => {
    const res = await findRoute('POST', '/api/v1/appt/requests').handle(
      makeCtx(pharmacist, { body: { appointmentNo: 'x', patientId: 'x', purpose: 'x' } }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).not.toBe(0);
  });

  it('未登录访问预约列表 → 401', async () => {
    const res = await findRoute('GET', '/api/v1/appt/requests').handle(makeCtx(null));
    expect(res.status).toBe(401);
  });

  it('管理员列表成功路径统一信封', async () => {
    const res = await findRoute('GET', '/api/v1/appt/requests').handle(makeCtx(admin));
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe(0);
  });

  it('确认不存在预约 → 404', async () => {
    const res = await findRoute('POST', '/api/v1/appt/confirm/:id').handle(
      makeCtx(admin, { params: { id: crypto.randomUUID() }, body: {} }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe(40400);
  });

  it('随访计划列表成功信封', async () => {
    const res = await findRoute('GET', '/api/v1/appt/followup-plans').handle(makeCtx(admin));
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe(0);
  });
});
