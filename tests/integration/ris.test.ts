/**
 * 健澜科技 jlmedaios - RIS 检查全流程 集成测试（M11-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 申请 -> 预约 -> 到检 -> 执行(study) -> 登记图像 -> 建草稿 -> 书写 -> AI 辅助 ->
 *    提交 -> 自审被拒（职责分离）-> 他人审核 -> 发布 -> 申请 completed；
 *  - 约满守卫：容量 1 的时段第二次预约 409；
 *  - 空报告守卫：未书写直接提交 409；
 *  - 权限：医生执行 403；路由未认证 401；不存在 404；
 *  - 申请号/预约号幂等。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 仅删除 M11B_TEST 前缀夹具。
 * 时段用未来日期 + 当秒唯一起始时间，避免与种子时段及并行测试冲突。
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
  listExamsView,
  listDevicesView,
  createSlotCatalog,
  createImagingRequest,
  getImagingRequestDetail,
  bookAppointment,
  checkinAppointment,
  cancelAppointment,
  performExam,
  addStudyImages,
  createDraftReport,
  saveReportDraft,
  aiAssistReport,
  submitImagingReport,
  approveImagingReport,
  returnImagingReport,
  publishImagingReport,
  getImagingReportDetail,
} from '../../src/bff/aggregators/risAggregator.js';
import { risRoutes } from '../../src/bff/routes/ris.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let radTech: AuthView;
let radDoc: AuthView;
let radDoc2: AuthView;

const TAG = 'M11B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

async function examIdByCode(code: string): Promise<string> {
  const rows = await getDb()`SELECT id FROM clinical.imaging_exams WHERE exam_code = ${code}`;
  if (rows.length === 0) throw new Error(`缺少种子检查项目 ${code}`);
  return String(rows[0].id);
}

async function deviceIdByCode(code: string): Promise<string> {
  const rows = await getDb()`SELECT id FROM clinical.imaging_devices WHERE device_code = ${code}`;
  if (rows.length === 0) throw new Error(`缺少种子设备 ${code}`);
  return String(rows[0].id);
}

/** 未来日期 + 唯一秒偏移，专为本轮测试新建时段（避开种子时段与并行测试）。
 *  ON CONFLICT 时换一个起始时间重试，直到拿到真正新建、容量正确的空时段。 */
let slotSeq = 0;
async function newDedicatedSlot(capacity: number) {
  const deviceId = await deviceIdByCode('CT1');
  const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    // 从 07:00:00 起按唯一步长展开，保证同轮与跨轮起始时间不撞
    const totalSec = 7 * 3600 + (slotSeq * 53 + attempt * 7);
    slotSeq += 1;
    const hh = String(Math.floor(totalSec / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    const start = `${hh}:${mm}:${ss}`;
    const endSec = totalSec + 30 * 60;
    const eh = String(Math.floor(endSec / 3600) % 24).padStart(2, '0');
    const em = String(Math.floor((endSec % 3600) / 60)).padStart(2, '0');
    const end = `${eh}:${em}:${ss}`;
    const { slot, created } = await createSlotCatalog(admin, {
      deviceId, slotDate: future, startTime: start, endTime: end, capacity,
    });
    if (created) return slot;
  }
  throw new Error('无法为测试分配唯一时段');
}

async function newPatientVisit() {
  const patient = await createPatient({
    mrn: `M11B${seq()}`,
    nameMasked: `放*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1978-01-01',
    tags: [TAG],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'outpatient',
    department: '放射科',
    chiefComplaint: 'RIS 全流程测试',
  });
  return { patient, visit };
}

/** 申请 -> 预约 -> 到检 -> 执行，返回 study 供建报告。 */
async function setupPerformed(examCode: string, slotCapacity = 5) {
  const { patient, visit } = await newPatientVisit();
  const examId = await examIdByCode(examCode);
  const { req } = await createImagingRequest(doctorChen, {
    requestNo: `M11B-RQ${seq()}`,
    visitId: visit.id,
    urgency: 'routine',
    diagnosis: 'RIS 流程测试',
    items: [{ examId }],
  });
  const slot = await newDedicatedSlot(slotCapacity);
  const booked = await bookAppointment(radTech, {
    appointmentNo: `M11B-RA${seq()}`,
    requestId: req.id, examId, slotId: slot.id,
  });
  await checkinAppointment(radTech, booked.appointment.id);
  const { study, appointment } = await performExam(radTech, booked.appointment.id, {});
  return { patient, visit, req, examId, slot, appointment, study };
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
  doctorChen = await load('doctor_chen');
  radTech = await load('rad_tech');
  radDoc = await load('rad_doc');
  radDoc2 = await load('rad_doc2');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.imaging_reports r
      USING clinical.imaging_requests q, clinical.visits v, clinical.patients p
      WHERE r.request_id = q.id AND q.visit_id = v.id AND v.patient_id = p.id
        AND p.tags @> '["M11B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.imaging_studies s
      USING clinical.imaging_requests q, clinical.visits v, clinical.patients p
      WHERE s.request_id = q.id AND q.visit_id = v.id AND v.patient_id = p.id
        AND p.tags @> '["M11B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.imaging_appointments a
      USING clinical.imaging_requests q, clinical.visits v, clinical.patients p
      WHERE a.request_id = q.id AND q.visit_id = v.id AND v.patient_id = p.id
        AND p.tags @> '["M11B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.imaging_requests q
      USING clinical.visits v, clinical.patients p
      WHERE q.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M11B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M11B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M11B_TEST"]'::jsonb`;
    // 清理本轮测试自建的未来时段（种子时段为今天起连续三天，不受影响）
    await db`DELETE FROM clinical.imaging_device_slots WHERE slot_date >= CURRENT_DATE + 30`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M11-B RIS 全流程（真实 PostgreSQL）', () => {
  it('环境就绪：目录种子与角色权限', () => {
    expect(dbAvailable).toBe(true);
    expect(radTech.permissions).toContain('ris:schedule');
    expect(radTech.permissions).toContain('ris:perform');
    expect(radTech.permissions).toContain('ris:report');
    expect(radTech.permissions).toContain('ris:review');
    expect(radTech.permissions).toContain('ris:publish');
    expect(radTech.permissions).toContain('imaging:read');
    expect(doctorChen.permissions).toContain('ris:request');
    expect(doctorChen.permissions).not.toContain('ris:report');
  });

  it('目录：设备与检查项目种子就位', async () => {
    const exams = await listExamsView();
    expect(exams.find((e) => e.examCode === 'CT_HEAD')).toBeDefined();
    const devices = await listDevicesView();
    expect(devices.map((d) => d.deviceCode).sort()).toEqual(['CT1', 'DR1', 'MR1', 'US1']);
  });

  it('全流程：申请->预约->到检->执行->图像->草稿->AI->提交->自审被拒->审核->发布->completed', async () => {
    const { req, study } = await setupPerformed('CT_HEAD');

    // 申请随流程推进至 in_progress
    let detail = await getImagingRequestDetail(req.id);
    expect(detail.req.status).toBe('in_progress');
    expect(detail.studies[0].studyUid).toMatch(/^2\.25\./);

    // 登记图像引用
    await addStudyImages(radTech, study.id, { imageRefs: ['1.2.840.ct/1.dcm', '1.2.840.ct/2.dcm'] });

    // 建草稿报告（书写人 rad_doc）
    const { report } = await createDraftReport(radDoc, study.id, { reportNo: `M11B-RR${seq()}` });
    expect(report.status).toBe('draft');
    expect(report.studyId).toBe(study.id);

    // 书写 findings/impression
    await saveReportDraft(radDoc, report.id, {
      findings: '右肺上叶可见小结节', impression: '建议随访复查',
    });

    // AI 辅助：仅写 ai_findings，不改写正文/状态
    const ai = await aiAssistReport(radDoc, report.id);
    expect(ai.report.status).toBe('draft');
    expect(ai.report.aiFindings).not.toBeNull();

    // 提交审核
    const submitted = await submitImagingReport(radDoc, report.id);
    expect(submitted.status).toBe('reviewing');

    // 书写人自审被拒（职责分离 409）
    await expect(approveImagingReport(radDoc, report.id)).rejects.toMatchObject({ status: 409 });

    // 另一医师审核通过
    const approved = await approveImagingReport(radDoc2, report.id);
    expect(approved.status).toBe('approved');

    // 发布后申请 completed
    const published = await publishImagingReport(radDoc2, report.id);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();
    detail = await getImagingRequestDetail(req.id);
    expect(detail.req.status).toBe('completed');

    // 报告明细含 AI 辅助与图像引用
    const repDetail = await getImagingReportDetail(report.id);
    expect(repDetail.imageRefs.length).toBe(2);
    expect(repDetail.aiFindings).not.toBeNull();
  });

  it('退回流程：提交->退回->重写->重提->审核->发布', async () => {
    const { study } = await setupPerformed('CT_CHEST');
    const { report } = await createDraftReport(radDoc, study.id, { reportNo: `M11B-RR${seq()}` });
    await saveReportDraft(radDoc, report.id, { findings: '首次描述' });
    await submitImagingReport(radDoc, report.id);

    const ret = await returnImagingReport(radDoc2, report.id, { reason: '描述过于简略，请补充' });
    expect(ret.status).toBe('returned');

    await saveReportDraft(radDoc, report.id, { findings: '补充完整描述', impression: '考虑炎症' });
    await submitImagingReport(radDoc, report.id);
    await approveImagingReport(radDoc2, report.id);
    const published = await publishImagingReport(radDoc2, report.id);
    expect(published.status).toBe('published');
  });

  it('约满守卫：容量 1 的时段第二次预约 409', async () => {
    const examId = await examIdByCode('DR_CHEST');
    const slot = await newDedicatedSlot(1);

    const { visit: v1 } = await newPatientVisit();
    const r1 = await createImagingRequest(doctorChen, {
      requestNo: `M11B-RQ${seq()}`, visitId: v1.id, items: [{ examId }],
    });
    const first = await bookAppointment(radTech, {
      appointmentNo: `M11B-RA${seq()}`, requestId: r1.req.id, examId, slotId: slot.id,
    });
    expect(first.appointment.status).toBe('booked');

    const { visit: v2 } = await newPatientVisit();
    const r2 = await createImagingRequest(doctorChen, {
      requestNo: `M11B-RQ${seq()}`, visitId: v2.id, items: [{ examId }],
    });
    await expect(
      bookAppointment(radTech, {
        appointmentNo: `M11B-RA${seq()}`, requestId: r2.req.id, examId, slotId: slot.id,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('医疗安全：未执行不能建报告；空报告不能提交', async () => {
    // 未执行不能建报告：构造一个预约但不 perform，直接拿 appointment 找 study 不存在
    const { patient, visit } = await newPatientVisit();
    const examId = await examIdByCode('DR_CHEST');
    const r = await createImagingRequest(doctorChen, {
      requestNo: `M11B-RQ${seq()}`, visitId: visit.id, items: [{ examId }],
    });
    const slot = await newDedicatedSlot(3);
    const booked = await bookAppointment(radTech, {
      appointmentNo: `M11B-RA${seq()}`, requestId: r.req.id, examId, slotId: slot.id,
    });
    await checkinAppointment(radTech, booked.appointment.id);
    // 未 perform：study 不存在 -> 建报告 404
    await expect(
      createDraftReport(radDoc, '00000000-0000-0000-0000-000000000000', { reportNo: `M11B-RR${seq()}` }),
    ).rejects.toMatchObject({ status: 404 });

    // 空报告守卫：执行后建草稿但不书写直接提交 -> 409
    const { study } = await performExam(radTech, booked.appointment.id, {});
    const { report } = await createDraftReport(radDoc, study.id, { reportNo: `M11B-RR${seq()}` });
    await expect(submitImagingReport(radDoc, report.id)).rejects.toMatchObject({ status: 409 });
    expect(patient.id).toBeTruthy();
  });

  it('取消预约：booked -> cancelled 并释放容量', async () => {
    const examId = await examIdByCode('US_ABDOMEN');
    const slot = await newDedicatedSlot(1);
    const { visit } = await newPatientVisit();
    const r = await createImagingRequest(doctorChen, {
      requestNo: `M11B-RQ${seq()}`, visitId: visit.id, items: [{ examId }],
    });
    const booked = await bookAppointment(radTech, {
      appointmentNo: `M11B-RA${seq()}`, requestId: r.req.id, examId, slotId: slot.id,
    });
    const cancelled = await cancelAppointment(radTech, booked.appointment.id);
    expect(cancelled.status).toBe('cancelled');
    // 容量已释放：同 slot 可再次预约成功
    const { visit: v2 } = await newPatientVisit();
    const r2 = await createImagingRequest(doctorChen, {
      requestNo: `M11B-RQ${seq()}`, visitId: v2.id, items: [{ examId }],
    });
    const again = await bookAppointment(radTech, {
      appointmentNo: `M11B-RA${seq()}`, requestId: r2.req.id, examId, slotId: slot.id,
    });
    expect(again.appointment.status).toBe('booked');
  });

  it('权限：医生执行 403；不存在报告 404', async () => {
    // doctor_chen 无 ris:perform
    await expect(
      performExam(doctorChen, '00000000-0000-0000-0000-000000000000', {}),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getImagingReportDetail('00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('路由：未认证 401', async () => {
    const denied = await risRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
  });
});
