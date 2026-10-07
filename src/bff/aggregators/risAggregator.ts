/**
 * 健澜科技 jlmedaios - RIS 检查全流程聚合器（M11-B）
 *
 * 申请 → 预约 → 到检 → 执行（生成 study）→ 报告草稿/AI 辅助 → 提交/审核/退回/发布全闭环。
 * 状态机/职责分离/报告内容完整性全部委托确定性规则引擎，本层负责取数、
 * FOR UPDATE 行锁、权限、slot 容量校验与同事务哈希链审计。
 *
 * 医疗安全守卫（缺一不可）：
 *  - study 未执行不能建报告；
 *  - 报告无内容（findings/impression 全空）不能提交审核；
 *  - 书写人 ≠ 审核人（职责分离）；
 *  - AI 仅写 ai_findings，不自动写 findings/impression、不自动提交/发布；
 *  - 预约在事务内锁 slot FOR UPDATE，booked_count < capacity 方可 +1（防约满）；
 *  - 申请下全部报告发布后，申请方流转 completed。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { RadarAdapter } from '../../integration/adapters/radar/index.js';
import {
  REQUEST_TRANSITIONS,
  APPOINTMENT_TRANSITIONS,
  REPORT_TRANSITIONS,
  canTransition,
  assertSeparation,
  hasReportContent,
  genStudyUid,
} from '../../medical-tools/imaging/risWorkflow.js';
import {
  listExams,
  listDevices,
  getExamById,
  getDeviceById,
  createExam,
  createDevice,
  createSlot,
  listSlots,
  lockSlotById,
  incSlotBooked,
  decSlotBooked,
  createRequest,
  addRequestItem,
  getRequestById,
  lockRequestById,
  getRequestItems,
  listRequests,
  patchRequest,
  insertAppointment,
  getAppointmentById,
  lockAppointmentById,
  patchAppointment,
  listAppointments,
  insertStudy,
  getStudyById,
  lockStudyById,
  listStudies,
  setStudyImages,
  createReportForStudy,
  getImagingReportById,
  lockImagingReportById,
  patchImagingReport,
  setReportAiFindings,
  getReportsByRequest,
  listImagingReports,
  type ImagingExam,
  type ImagingDevice,
  type ImagingDeviceSlot,
  type ImagingRequest,
  type ImagingRequestItem,
  type ImagingAppointment,
  type ImagingStudy,
  type ImagingReport,
} from '../../db/repositories/risRepo.js';

export class RisError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RisError';
  }
}
const badRequest = (m: string) => new RisError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new RisError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new RisError(409, 'CONFLICT', m);
const forbidden = (m: string) => new RisError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string | undefined | null, label: string): asserts id is string {
  if (!id || !UUID_RE.test(String(id).trim())) throw badRequest(`${label} 须为用户 UUID`);
}

const URGENCIES = ['routine', 'urgent', 'stat'];
const MODALITIES = ['CR', 'DX', 'CT', 'MR', 'US', 'XA', 'PT', 'NM', 'MG'];

/** RADAR 推理适配器：上游不可用时 submitJob 降级返回确定性 demo 结果（仅辅助）。 */
const radar = new RadarAdapter();

// ---------------------------------------------------------------------------
// 目录
// ---------------------------------------------------------------------------

export async function listExamsView(): Promise<ImagingExam[]> {
  return listExams();
}

export async function listDevicesView(): Promise<ImagingDevice[]> {
  return listDevices();
}

export async function listSlotsView(filter: { deviceId?: string; date?: string }): Promise<ImagingDeviceSlot[]> {
  if (filter.deviceId) assertUuid(filter.deviceId, '设备');
  return listSlots(filter);
}

export async function createExamCatalog(
  auth: AuthView,
  input: {
    examCode: string; name: string; modality: string;
    bodyPart?: string | null; price?: number;
    needsScheduling?: boolean; durationMinutes?: number;
  },
): Promise<{ exam: ImagingExam; created: boolean }> {
  assertPermission(auth, 'ris:catalog');
  if (!input.examCode?.trim()) throw badRequest('检查项目编码不能为空');
  if (!input.name?.trim()) throw badRequest('检查项目名称不能为空');
  if (!MODALITIES.includes(input.modality)) throw badRequest('模态须为 CR/DX/CT/MR/US/XA/PT/NM/MG');
  return withTx(async (tx) => {
    const { exam, created } = await createExam(
      {
        examCode: input.examCode.trim(), name: input.name.trim(), modality: input.modality,
        bodyPart: input.bodyPart ?? null, price: input.price,
        needsScheduling: input.needsScheduling, durationMinutes: input.durationMinutes,
      },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'ris.catalog', resourceType: 'imaging_exam', resourceId: exam.id,
      result: 'success', riskLevel: 'low', detail: { code: exam.examCode, created },
    }, tx);
    return { exam, created };
  });
}

export async function createDeviceCatalog(
  auth: AuthView,
  input: { deviceCode: string; name: string; modality: string; room?: string | null },
): Promise<{ device: ImagingDevice; created: boolean }> {
  assertPermission(auth, 'ris:catalog');
  if (!input.deviceCode?.trim()) throw badRequest('设备编码不能为空');
  if (!input.name?.trim()) throw badRequest('设备名称不能为空');
  if (!MODALITIES.includes(input.modality)) throw badRequest('模态须为 CR/DX/CT/MR/US/XA/PT/NM/MG');
  return withTx(async (tx) => {
    const { device, created } = await createDevice(
      {
        deviceCode: input.deviceCode.trim(), name: input.name.trim(),
        modality: input.modality, room: input.room ?? null,
      },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'ris.catalog', resourceType: 'imaging_device', resourceId: device.id,
      result: 'success', riskLevel: 'low', detail: { code: device.deviceCode, created },
    }, tx);
    return { device, created };
  });
}

export async function createSlotCatalog(
  auth: AuthView,
  input: { deviceId: string; slotDate: string; startTime: string; endTime: string; capacity?: number },
): Promise<{ slot: ImagingDeviceSlot; created: boolean }> {
  assertPermission(auth, 'ris:catalog');
  assertUuid(input.deviceId, '设备');
  if (!input.slotDate) throw badRequest('时段日期不能为空');
  if (!input.startTime) throw badRequest('开始时间不能为空');
  if (!input.endTime) throw badRequest('结束时间不能为空');
  return withTx(async (tx) => {
    const device = await getDeviceByIdOrThrow(input.deviceId, tx);
    const { slot, created } = await createSlot(
      {
        deviceId: device.id, slotDate: input.slotDate, startTime: input.startTime,
        endTime: input.endTime, capacity: input.capacity,
      },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'ris.catalog', resourceType: 'imaging_device_slot', resourceId: slot.id,
      result: 'success', riskLevel: 'low', detail: { created },
    }, tx);
    return { slot, created };
  });
}

// ---------------------------------------------------------------------------
// 检查申请
// ---------------------------------------------------------------------------

export interface ImagingRequestLine {
  examId: string;
}

export async function createImagingRequest(
  auth: AuthView,
  input: {
    requestNo: string;
    visitId: string;
    urgency?: string;
    diagnosis?: string | null;
    chiefComplaint?: string | null;
    items: ImagingRequestLine[];
  },
): Promise<{ req: ImagingRequest; created: boolean; items: ImagingRequestItem[] }> {
  assertPermission(auth, 'ris:request');
  if (!input.requestNo?.trim()) throw badRequest('申请单号不能为空');
  assertUuid(input.visitId, '就诊');
  const urgency = input.urgency ?? 'routine';
  if (!URGENCIES.includes(urgency)) throw badRequest('紧急度须为 routine/urgent/stat');
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest('申请检查项目不能为空');
  }
  for (const line of input.items) {
    assertUuid(line.examId, '检查项目');
  }

  return withTx(async (tx) => {
    const visit = await getVisitById(input.visitId, tx);
    if (!visit) throw notFound('就诊记录不存在');
    const { req, created } = await createRequest(
      {
        requestNo: input.requestNo.trim(),
        visitId: visit.id,
        patientId: visit.patientId,
        orderedBy: auth.id,
        urgency,
        diagnosis: input.diagnosis ?? null,
        chiefComplaint: input.chiefComplaint ?? null,
      },
      tx,
    );
    if (created) {
      for (const line of input.items) {
        await addRequestItem({ requestId: req.id, examId: line.examId }, tx);
      }
    }
    const items = await getRequestItems(req.id, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.request', resourceType: 'imaging_request', resourceId: req.id,
      result: 'success', riskLevel: 'low',
      detail: { requestNo: req.requestNo, created, lineCount: items.length },
    }, tx);
    return { req, created, items };
  });
}

export async function listImagingRequestsView(filter: {
  status?: string; patientId?: string; visitId?: string;
}): Promise<ImagingRequest[]> {
  if (filter.patientId) assertUuid(filter.patientId, '患者');
  if (filter.visitId) assertUuid(filter.visitId, '就诊');
  return listRequests(filter);
}

export async function getImagingRequestDetail(requestId: string) {
  assertUuid(requestId, '检查申请');
  const req = await getRequestById(requestId);
  if (!req) throw notFound('检查申请不存在');
  const [items, appointments, studies, reports] = await Promise.all([
    getRequestItems(requestId),
    listAppointments({ requestId }),
    listStudies({ requestId }),
    getReportsByRequest(requestId),
  ]);
  return { req, items, appointments, studies, reports };
}

export async function cancelImagingRequest(
  auth: AuthView,
  requestId: string,
  input: { reason: string },
): Promise<ImagingRequest> {
  assertPermission(auth, 'ris:request');
  assertUuid(requestId, '检查申请');
  if (!input.reason?.trim()) throw badRequest('取消原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockRequestById(requestId, tx);
    if (!locked) throw notFound('检查申请不存在');
    if (!canTransition(REQUEST_TRANSITIONS, locked.status as never, 'cancelled')) {
      throw conflict(`当前状态（${locked.status}）不可取消`);
    }
    const updated = await patchRequest(requestId, {
      status: 'cancelled',
      cancelled_by: auth.id,
      cancelled_at: new Date().toISOString(),
      cancel_reason: input.reason.trim(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.request', resourceType: 'imaging_request', resourceId: requestId,
      result: 'success', riskLevel: 'low', detail: { cancel: true, reason: input.reason.trim() },
    }, tx);
    return updated;
  });
}

// ---------------------------------------------------------------------------
// 预约 / 到检
// ---------------------------------------------------------------------------

async function getDeviceByIdOrThrow(id: string, tx: DbExecutor): Promise<ImagingDevice> {
  const device = await getDeviceById(id, tx);
  if (!device) throw notFound('检查设备不存在');
  return device;
}

export async function bookAppointment(
  auth: AuthView,
  input: { appointmentNo: string; requestId: string; examId: string; slotId: string },
): Promise<{ appointment: ImagingAppointment; created: boolean }> {
  assertPermission(auth, 'ris:schedule');
  if (!input.appointmentNo?.trim()) throw badRequest('预约单号不能为空');
  assertUuid(input.requestId, '检查申请');
  assertUuid(input.examId, '检查项目');
  assertUuid(input.slotId, '时段');

  return withTx(async (tx) => {
    const locked = await lockRequestById(input.requestId, tx);
    if (!locked) throw notFound('检查申请不存在');
    if (locked.status === 'cancelled') throw conflict('申请已取消，不能预约');

    const exam = await getExamById(input.examId, tx);
    if (!exam) throw notFound('检查项目不存在');
    const lines = await getRequestItems(locked.id, tx);
    if (!lines.some((l) => l.examId === input.examId)) {
      throw badRequest('该检查项目不在申请单内');
    }

    // 容量守卫：事务内锁时段行，booked_count < capacity 方可占用
    const slot = await lockSlotById(input.slotId, tx);
    if (!slot) throw notFound('检查时段不存在');
    if (!slot.isActive) throw conflict('该时段已停用');
    if (slot.bookedCount >= slot.capacity) throw conflict('该时段约满');

    const scheduledStart = `${slot.slotDate}T${slot.startTime}+08:00`;
    const appointment = await insertAppointment(
      {
        appointmentNo: input.appointmentNo.trim(),
        requestId: locked.id,
        examId: exam.id,
        slotId: slot.id,
        deviceId: slot.deviceId,
        scheduledStart,
        createdBy: auth.id,
      },
      tx,
    );
    await incSlotBooked(slot.id, tx);

    // 申请 requested -> scheduled
    if (canTransition(REQUEST_TRANSITIONS, locked.status as never, 'scheduled')) {
      await patchRequest(locked.id, { status: 'scheduled' }, tx);
    }

    await recordChainAudit({
      actorId: auth.id, action: 'ris.schedule', resourceType: 'imaging_appointment', resourceId: appointment.id,
      result: 'success', riskLevel: 'low',
      detail: { appointmentNo: appointment.appointmentNo, slotId: slot.id },
    }, tx);
    return { appointment, created: true };
  });
}

export async function listAppointmentsView(filter: {
  status?: string; requestId?: string;
}): Promise<ImagingAppointment[]> {
  if (filter.requestId) assertUuid(filter.requestId, '检查申请');
  return listAppointments(filter);
}

export async function checkinAppointment(auth: AuthView, appointmentId: string): Promise<ImagingAppointment> {
  assertPermission(auth, 'ris:schedule');
  assertUuid(appointmentId, '预约');
  return withTx(async (tx) => {
    const locked = await lockAppointmentById(appointmentId, tx);
    if (!locked) throw notFound('预约记录不存在');
    if (!canTransition(APPOINTMENT_TRANSITIONS, locked.status as never, 'arrived')) {
      throw conflict(`预约状态（${locked.status}）不能到检登记`);
    }
    const updated = await patchAppointment(appointmentId, {
      status: 'arrived', checked_in_at: new Date().toISOString(),
    }, tx);
    // 申请 scheduled -> arrived
    const req = await lockRequestById(locked.requestId, tx);
    if (req && canTransition(REQUEST_TRANSITIONS, req.status as never, 'arrived')) {
      await patchRequest(req.id, { status: 'arrived' }, tx);
    }
    await recordChainAudit({
      actorId: auth.id, action: 'ris.schedule', resourceType: 'imaging_appointment', resourceId: appointmentId,
      result: 'success', riskLevel: 'low', detail: { checkin: true },
    }, tx);
    return updated;
  });
}

export async function cancelAppointment(auth: AuthView, appointmentId: string): Promise<ImagingAppointment> {
  assertPermission(auth, 'ris:schedule');
  assertUuid(appointmentId, '预约');
  return withTx(async (tx) => {
    const locked = await lockAppointmentById(appointmentId, tx);
    if (!locked) throw notFound('预约记录不存在');
    if (!canTransition(APPOINTMENT_TRANSITIONS, locked.status as never, 'cancelled')) {
      throw conflict(`预约状态（${locked.status}）不能取消`);
    }
    const updated = await patchAppointment(appointmentId, { status: 'cancelled' }, tx);
    // 释放时段容量（不低于 0）
    await decSlotBooked(locked.slotId, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.schedule', resourceType: 'imaging_appointment', resourceId: appointmentId,
      result: 'success', riskLevel: 'low', detail: { cancel: true },
    }, tx);
    return updated;
  });
}

// ---------------------------------------------------------------------------
// 检查执行 / Study
// ---------------------------------------------------------------------------

export async function performExam(
  auth: AuthView,
  appointmentId: string,
  input: { studyUid?: string },
): Promise<{ study: ImagingStudy; appointment: ImagingAppointment }> {
  assertPermission(auth, 'ris:perform');
  assertUuid(appointmentId, '预约');
  return withTx(async (tx) => {
    const locked = await lockAppointmentById(appointmentId, tx);
    if (!locked) throw notFound('预约记录不存在');
    if (!canTransition(APPOINTMENT_TRANSITIONS, locked.status as never, 'done')) {
      throw conflict(`预约状态（${locked.status}）不能执行检查`);
    }
    const exam = await getExamById(locked.examId, tx);
    if (!exam) throw notFound('检查项目不存在');

    const studyUid = input.studyUid?.trim() || genStudyUid(locked.id);
    const study = await insertStudy(
      {
        studyUid,
        appointmentId: locked.id,
        requestId: locked.requestId,
        examId: locked.examId,
        deviceId: locked.deviceId,
        modality: exam.modality,
        performedBy: auth.id,
      },
      tx,
    );
    const appointment = await patchAppointment(appointmentId, { status: 'done' }, tx);

    // 申请 arrived -> in_progress
    const req = await lockRequestById(locked.requestId, tx);
    if (req && canTransition(REQUEST_TRANSITIONS, req.status as never, 'in_progress')) {
      await patchRequest(req.id, { status: 'in_progress' }, tx);
    }

    await recordChainAudit({
      actorId: auth.id, action: 'ris.perform', resourceType: 'imaging_study', resourceId: study.id,
      result: 'success', riskLevel: 'medium', detail: { studyUid, appointmentId: locked.id },
    }, tx);
    return { study, appointment };
  });
}

export async function listStudiesView(filter: { requestId?: string }): Promise<ImagingStudy[]> {
  if (filter.requestId) assertUuid(filter.requestId, '检查申请');
  return listStudies(filter);
}

export async function addStudyImages(
  auth: AuthView,
  studyId: string,
  input: { imageRefs: string[] },
): Promise<ImagingStudy> {
  assertPermission(auth, 'ris:perform');
  assertUuid(studyId, '检查执行记录');
  if (!Array.isArray(input.imageRefs)) throw badRequest('图像引用列表须为数组');
  return withTx(async (tx) => {
    const locked = await lockStudyById(studyId, tx);
    if (!locked) throw notFound('检查执行记录不存在');
    const updated = await setStudyImages(studyId, input.imageRefs, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.perform', resourceType: 'imaging_study', resourceId: studyId,
      result: 'success', riskLevel: 'low', detail: { images: updated.imageRefs.length },
    }, tx);
    return updated;
  });
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

export async function createDraftReport(
  auth: AuthView,
  studyId: string,
  input: { reportNo: string },
): Promise<{ report: ImagingReport; created: boolean }> {
  assertPermission(auth, 'ris:report');
  assertUuid(studyId, '检查执行记录');
  if (!input.reportNo?.trim()) throw badRequest('报告单号不能为空');
  return withTx(async (tx) => {
    const study = await lockStudyById(studyId, tx);
    if (!study) throw notFound('检查执行记录不存在');
    // 医疗安全：未执行（study 已 performed 方可建报告）
    if (study.status !== 'performed') throw conflict('检查尚未执行，不能建报告');

    const req = await lockRequestById(study.requestId, tx);
    if (!req) throw notFound('检查申请不存在');
    const exam = await getExamById(study.examId, tx);
    if (!exam) throw notFound('检查项目不存在');

    const { report, created } = await createReportForStudy(
      {
        reportNo: input.reportNo.trim(),
        study,
        requestId: study.requestId,
        appointmentId: study.appointmentId,
        examId: study.examId,
        visitId: req.visitId,
        patientId: req.patientId,
        examName: exam.name,
        bodyPart: exam.bodyPart,
      },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'ris.report', resourceType: 'imaging_report', resourceId: report.id,
      result: 'success', riskLevel: 'low', detail: { step: 'draft', reportNo: report.reportNo, created },
    }, tx);
    return { report, created };
  });
}

export async function saveReportDraft(
  auth: AuthView,
  reportId: string,
  input: { findings?: string | null; impression?: string | null },
): Promise<ImagingReport> {
  assertPermission(auth, 'ris:report');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockImagingReportById(reportId, tx);
    if (!locked) throw notFound('影像报告不存在');
    if (!['draft', 'returned'].includes(locked.status)) {
      throw conflict(`报告状态（${locked.status}）不能保存草稿`);
    }
    const fields: Record<string, unknown> = {};
    if (input.findings !== undefined) fields.findings = input.findings;
    if (input.impression !== undefined) fields.impression = input.impression;
    // 首次书写人：仅在未记录时落定，保证职责分离基线不被后续覆盖
    if (!locked.writtenBy) fields.written_by = auth.id;
    const updated = await patchImagingReport(reportId, fields, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.report', resourceType: 'imaging_report', resourceId: reportId,
      result: 'success', riskLevel: 'low', detail: { step: 'save_draft' },
    }, tx);
    return updated;
  });
}

export async function aiAssistReport(auth: AuthView, reportId: string): Promise<{ report: ImagingReport; degraded: boolean }> {
  assertPermission(auth, 'ris:report');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockImagingReportById(reportId, tx);
    if (!locked) throw notFound('影像报告不存在');
    if (!['draft', 'returned'].includes(locked.status)) {
      throw conflict(`报告状态（${locked.status}）不能进行 AI 辅助`);
    }
    // AI 仅辅助：结果写入 ai_findings，不写 findings/impression、不改变状态
    const { degraded, localResult } = await radar.submitJob({
      study_uid: locked.studyUid ?? `STUDY_${locked.id}`,
      source: 'demo',
    });
    const updated = await setReportAiFindings(reportId, localResult ?? { degraded: true }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.report', resourceType: 'imaging_report', resourceId: reportId,
      result: 'success', riskLevel: 'low', detail: { step: 'ai_assist', degraded },
    }, tx);
    return { report: updated, degraded };
  });
}

export async function submitImagingReport(auth: AuthView, reportId: string): Promise<ImagingReport> {
  assertPermission(auth, 'ris:report');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockImagingReportById(reportId, tx);
    if (!locked) throw notFound('影像报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'reviewing')) {
      throw conflict(`报告状态（${locked.status}）不能提交审核`);
    }
    // 医疗安全：空报告不能提交（findings/impression 至少一项非空）
    if (!hasReportContent({ findings: locked.findings, impression: locked.impression })) {
      throw conflict('报告尚未书写，不能提交审核');
    }
    // 医疗安全：study 必须已执行
    if (locked.studyId) {
      const study = await getStudyById(locked.studyId, tx);
      if (!study || study.status !== 'performed') throw conflict('检查尚未执行，不能提交报告');
    }
    const updated = await patchImagingReport(reportId, {
      status: 'reviewing', submitted_at: new Date().toISOString(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.submit', resourceType: 'imaging_report', resourceId: reportId,
      result: 'success', riskLevel: 'low', detail: { from: locked.status, to: 'reviewing' },
    }, tx);
    return updated;
  });
}

export async function approveImagingReport(auth: AuthView, reportId: string): Promise<ImagingReport> {
  assertPermission(auth, 'ris:review');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockImagingReportById(reportId, tx);
    if (!locked) throw notFound('影像报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'approved')) {
      throw conflict(`报告状态（${locked.status}）不能审核通过`);
    }
    // 职责分离：书写人不得审核自己的报告
    if (locked.writtenBy && !assertSeparation(locked.writtenBy, auth.id)) {
      throw conflict('书写人与审核人不能为同一人，须职责分离');
    }
    const updated = await patchImagingReport(reportId, {
      status: 'approved', reviewed_by: auth.id, reviewed_at: new Date().toISOString(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.approve', resourceType: 'imaging_report', resourceId: reportId,
      result: 'success', riskLevel: 'medium', detail: { from: 'reviewing', to: 'approved' },
    }, tx);
    return updated;
  });
}

export async function returnImagingReport(
  auth: AuthView,
  reportId: string,
  input: { reason: string },
): Promise<ImagingReport> {
  assertPermission(auth, 'ris:review');
  assertUuid(reportId, '报告');
  if (!input.reason?.trim()) throw badRequest('退回原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockImagingReportById(reportId, tx);
    if (!locked) throw notFound('影像报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'returned')) {
      throw conflict(`报告状态（${locked.status}）不能退回`);
    }
    const updated = await patchImagingReport(reportId, {
      status: 'returned', returned_by: auth.id, returned_at: new Date().toISOString(),
      return_reason: input.reason.trim(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'ris.return', resourceType: 'imaging_report', resourceId: reportId,
      result: 'success', riskLevel: 'low', detail: { reason: input.reason.trim() },
    }, tx);
    return updated;
  });
}

export async function publishImagingReport(auth: AuthView, reportId: string): Promise<ImagingReport> {
  assertPermission(auth, 'ris:publish');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockImagingReportById(reportId, tx);
    if (!locked) throw notFound('影像报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'published')) {
      throw conflict(`报告状态（${locked.status}）不能发布`);
    }
    const now = new Date().toISOString();
    const updated = await patchImagingReport(reportId, {
      status: 'published', published_by: auth.id, published_at: now, report_time: now,
    }, tx);
    // 申请下全部报告发布后，申请流转为 completed
    if (locked.requestId) {
      const reports = await getReportsByRequest(locked.requestId, tx);
      if (reports.length > 0 && reports.every((r) => r.status === 'published')) {
        const req = await lockRequestById(locked.requestId, tx);
        if (req && req.status !== 'completed' && req.status !== 'cancelled') {
          await patchRequest(locked.requestId, { status: 'completed' }, tx);
        }
      }
    }
    await recordChainAudit({
      actorId: auth.id, action: 'ris.publish', resourceType: 'imaging_report', resourceId: reportId,
      result: 'success', riskLevel: 'medium', detail: { from: 'approved', to: 'published' },
    }, tx);
    return updated;
  });
}

export async function listImagingReportsView(filter: {
  status?: string; patientId?: string; visitId?: string;
}): Promise<ImagingReport[]> {
  if (filter.patientId) assertUuid(filter.patientId, '患者');
  if (filter.visitId) assertUuid(filter.visitId, '就诊');
  return listImagingReports(filter);
}

export async function getImagingReportDetail(reportId: string) {
  assertUuid(reportId, '报告');
  const report = await getImagingReportById(reportId);
  if (!report) throw notFound('影像报告不存在');
  return { report, results: [], aiFindings: report.aiFindings, imageRefs: report.imageRefs };
}
