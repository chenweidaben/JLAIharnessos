/**
 * 健澜科技 jlmedaios - 缺陷整改闭环 集成测试（M9-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 下发整改（幂等：同病历同缺陷只一条）→ 责任医生整改 → 质控复核通过/驳回全链路；
 *  - 权限：非质控人下发/复核 403；非 assignee 整改 403；驳回缺原因 400；
 *  - 数据隔离：医生只看自己任务；质控人看全部；
 *  - 状态机：已整改不可重复提交 409；已复核不可再复核 409；
 *  - 并发：同一任务并发提交整改只成功一次（行锁）；
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
import { createMedicalRecord } from '../../src/db/repositories/medicalRecordRepo.js';
import {
  getRectificationDetail,
  getRectificationList,
  getRectificationStatsView,
  issueRectification,
  reviewRectification,
  submitRectification,
  type CreateRectificationBody,
} from '../../src/bff/aggregators/rectificationAggregator.js';
import { rectificationRoutes } from '../../src/bff/routes/rectification.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let doctorLi: AuthView;
let nurse: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

/** 新建患者/住院就诊/运行病历（author=doctorChen），返回 {recordId, visitId}。 */
async function newRecordFixture(): Promise<{ recordId: string; visitId: string }> {
  const patient = await createPatient({
    mrn: `M9B${seq()}`,
    nameMasked: `病*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1965-03-03',
    tags: ['M9B_TEST'],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: '呼吸内科',
    chiefComplaint: '咳嗽咳痰1周',
  });
  const record = await createMedicalRecord({
    visitId: visit.id,
    recordType: 'admission',
    title: '入院记录',
    content: { chiefComplaint: '咳嗽咳痰1周' },
    plainText: '患者咳嗽咳痰1周，无发热。',
    authorId: doctorChen.id,
  });
  return { recordId: record.id, visitId: visit.id };
}

/** 构造路由 Ctx（带 user 与 query）。 */
function makeCtx(
  user: { id: string; roles?: string[]; permissions?: string[] } | null,
  query = new URLSearchParams(),
): Ctx {
  return {
    user: user ? { ...user, roles: user.roles ?? ['admin'], permissions: user.permissions ?? [] } : null,
    query,
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
    // 清理顺序：整改任务 → 病历 → 诊断 → 就诊 → 患者
    await db`
      DELETE FROM quality.rectification_tasks rt
      WHERE rt.record_id IN (
        SELECT mr.id FROM clinical.medical_records mr
        JOIN clinical.visits v ON v.id = mr.visit_id
        JOIN clinical.patients p ON p.id = v.patient_id
        WHERE p.tags @> '["M9B_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.medical_records mr
      USING clinical.visits v, clinical.patients p
      WHERE mr.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M9B_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.diagnoses d
      USING clinical.visits v, clinical.patients p
      WHERE d.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M9B_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.visits v
      USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M9B_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.patients WHERE tags @> '["M9B_TEST"]'::jsonb
    `;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M9-B 缺陷整改闭环（真实 PostgreSQL）', () => {
  it('环境就绪：连接真实库并加载账号', () => {
    expect(dbAvailable).toBe(true);
    expect(admin.permissions).toContain('quality:review');
    expect(admin.permissions).toContain('quality:rectify');
    expect(doctorChen.permissions).toContain('quality:rectify');
    expect(doctorChen.permissions).not.toContain('quality:review');
  });

  it('全链路：下发 → 整改 → 复核通过', async () => {
    const { recordId } = await newRecordFixture();
    const body: CreateRectificationBody = {
      recordId,
      defectRuleId: 'RULE-INCOMPLETE-001',
      defectMessage: '入院记录缺少既往史',
      defectType: 'integrity',
      defectLevel: 'major',
      deduction: 5,
    };
    const { task, created } = await issueRectification(admin, body);
    expect(created).toBe(true);
    expect(task.status).toBe('pending');
    expect(task.assigneeId).toBe(doctorChen.id);
    expect(task.deduction).toBe(5);

    // 责任医生提交整改
    const rectified = await submitRectification(doctorChen, task.id, {
      content: '已补充既往史：高血压病史5年，规律服药。',
      note: '补充完成',
    });
    expect(rectified.status).toBe('rectified');
    expect(rectified.rectifyContent).toContain('高血压');

    // 质控复核通过
    const reviewed = await reviewRectification(admin, task.id, {
      result: 'approved',
      note: '整改到位',
    });
    expect(reviewed.status).toBe('reviewed');
    expect(reviewed.reviewedBy).toBe(admin.id);
    expect(reviewed.reviewResult).toBe('approved');
  });

  it('幂等：同病历同缺陷重复下发只一条', async () => {
    const { recordId } = await newRecordFixture();
    const body: CreateRectificationBody = {
      recordId,
      defectRuleId: 'RULE-TIME-001',
      defectMessage: '病程记录超时',
      defectType: 'timeliness',
      defectLevel: 'minor',
      deduction: 2,
    };
    const first = await issueRectification(admin, body);
    expect(first.created).toBe(true);
    const second = await issueRectification(admin, body);
    expect(second.created).toBe(false);
    expect(second.task.id).toBe(first.task.id);
    const list = await getRectificationList(admin, { assigneeId: doctorChen.id });
    expect(list.filter((t) => t.recordId === recordId).length).toBe(1);
  });

  it('权限：非质控人下发/复核 403；非 assignee 整改 403', async () => {
    const { recordId } = await newRecordFixture();
    // 护士无 quality:review → 下发被拒
    await expect(
      issueRectification(nurse, {
        recordId,
        defectRuleId: 'RULE-LOGIC-001',
        defectMessage: '诊断与用药不符',
        defectType: 'logic',
        defectLevel: 'critical',
      }),
    ).rejects.toMatchObject({ status: 403 });
    // 医生无 quality:review → 复核被拒
    const { task } = await issueRectification(admin, {
      recordId,
      defectRuleId: 'RULE-LOGIC-002',
      defectMessage: '诊断与用药不符',
      defectType: 'logic',
      defectLevel: 'critical',
    });
    await expect(
      reviewRectification(doctorChen, task.id, { result: 'approved', note: 'x' }),
    ).rejects.toMatchObject({ status: 403 });
    // doctor_li 非 assignee → 整改被拒
    await expect(
      submitRectification(doctorLi, task.id, { content: '无权整改' }),
    ).rejects.toMatchObject({ status: 403 });
    // 驳回缺原因 → 400
    await submitRectification(doctorChen, task.id, { content: '已整改：补充用药说明。' });
    await expect(
      reviewRectification(admin, task.id, { result: 'rejected', note: '' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('状态机：已整改不可重复提交 409；已复核不可再复核 409', async () => {
    const { recordId } = await newRecordFixture();
    const { task } = await issueRectification(admin, {
      recordId,
      defectRuleId: 'RULE-STD-001',
      defectMessage: '签名缺失',
      defectType: 'standardization',
      defectLevel: 'minor',
    });
    await submitRectification(doctorChen, task.id, { content: '已补充签名。' });
    await expect(
      submitRectification(doctorChen, task.id, { content: '再次提交' }),
    ).rejects.toMatchObject({ status: 409 });
    await reviewRectification(admin, task.id, { result: 'approved', note: 'ok' });
    await expect(
      reviewRectification(admin, task.id, { result: 'rejected', note: 'x' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('复核驳回 → 回到 pending 可重新整改再通过', async () => {
    const { recordId } = await newRecordFixture();
    const { task } = await issueRectification(admin, {
      recordId,
      defectRuleId: 'RULE-TIME-002',
      defectMessage: '首次病程超时',
      defectType: 'timeliness',
      defectLevel: 'major',
    });
    await submitRectification(doctorChen, task.id, { content: '已补录首次病程。' });
    const rejected = await reviewRectification(admin, task.id, {
      result: 'rejected',
      note: '补录时间仍超时，请完善',
    });
    expect(rejected.status).toBe('pending');
    expect(rejected.reviewResult).toBe('rejected');
    // 重新整改 → 复核通过
    await submitRectification(doctorChen, task.id, { content: '已完善首次病程时间线说明。' });
    const approved = await reviewRectification(admin, task.id, { result: 'approved', note: 'ok' });
    expect(approved.status).toBe('reviewed');
  });

  it('数据隔离：医生列表只含本人；详情非本人非质控人 403', async () => {
    const { recordId } = await newRecordFixture();
    await issueRectification(admin, {
      recordId,
      defectRuleId: 'RULE-STD-002',
      defectMessage: '缺上级医师签名',
      defectType: 'standardization',
      defectLevel: 'major',
    });
    const chenList = await getRectificationList(doctorChen);
    expect(chenList.every((t) => t.assigneeId === doctorChen.id)).toBe(true);
    const liList = await getRectificationList(doctorLi);
    expect(liList.some((t) => t.recordId === recordId)).toBe(false);
    // doctor_li 无权查看 doctor_chen 的任务详情
    const target = chenList.find((t) => t.recordId === recordId)!;
    await expect(getRectificationDetail(doctorLi, target.id)).rejects.toMatchObject({
      status: 403,
    });
    // 质控人可查看
    const detail = await getRectificationDetail(admin, target.id);
    expect(detail.assigneeName).toBeTruthy();
    expect(detail.patientName).toBeTruthy();
  });

  it('统计：质控人全量，医生仅本人', async () => {
    const adminStats = await getRectificationStatsView(admin);
    expect(adminStats.total).toBeGreaterThanOrEqual(1);
    const chenStats = await getRectificationStatsView(doctorChen);
    const list = await getRectificationList(doctorChen);
    expect(chenStats.total).toBe(list.length);
  });

  it('路由：未认证 401；下发缺病历 400；不存在任务详情 404', async () => {
    // 401
    const denied = await rectificationRoutes[2].handle(makeCtx(null));
    expect(denied.status).toBe(401);
    // 400：缺 recordId
    const adminCtx = makeCtx({ id: admin.id, roles: ['admin'] });
    const r400 = await rectificationRoutes[2].handle(
      Object.assign(adminCtx, {
        body: async () => ({ defectRuleId: 'R1', defectMessage: 'm', defectType: 'logic', defectLevel: 'minor' }),
      }),
    );
    expect(r400.status).toBe(400);
    // 404：不存在的任务
    const detailCtx = Object.assign(makeCtx({ id: admin.id, roles: ['admin'] }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    const r404 = await rectificationRoutes[3].handle(detailCtx);
    expect(r404.status).toBe(404);
  });

  it('并发：同一任务并发提交整改只成功一次（行锁）', async () => {
    const { recordId } = await newRecordFixture();
    const { task } = await issueRectification(admin, {
      recordId,
      defectRuleId: 'RULE-CONC-001',
      defectMessage: '并发测试缺陷',
      defectType: 'integrity',
      defectLevel: 'minor',
    });
    const attempt = () =>
      submitRectification(doctorChen, task.id, { content: `整改内容-${seq()}` })
        .then(() => 'ok')
        .catch((e: { status?: number }) => (e?.status === 409 ? 'conflict' : 'fail'));
    const results = await Promise.all([attempt(), attempt(), attempt()]);
    const ok = results.filter((r) => r === 'ok').length;
    const conflict = results.filter((r) => r === 'conflict').length;
    expect(ok).toBe(1);
    expect(conflict).toBe(2);
    // 落库只有一条 rectified 状态（复核后为 reviewed）
    await reviewRectification(admin, task.id, { result: 'approved', note: 'ok' });
    const detail = await getRectificationDetail(admin, task.id);
    expect(detail.status).toBe('reviewed');
  });
});
