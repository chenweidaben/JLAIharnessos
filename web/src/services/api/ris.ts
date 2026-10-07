/**
 * 健澜科技 jlmedaios - RIS/PACS 检查全流程 API（M11-B）
 *
 * 与冻结设计契约第 4 节端点一一对应（共 26）。全部使用相对路径 '/ris/...'
 * （axios 实例 baseURL=/api/v1，此处禁止再带 /api/v1 前缀，否则双前缀）。
 *
 * appointmentNo / reportNo 由前端生成：'RA'/'RR'+时间戳后8位+随机4位（契约第 5 节）；
 * requestNo 由前端生成：'RQ'+时间戳后8位+随机4位，保证并发下基本不冲突。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  AddImagesBody,
  CreateAppointmentBody,
  CreateImagingRequestBody,
  CreateSlotBody,
  ImagingAppointment,
  ImagingDevice,
  ImagingDeviceSlot,
  ImagingExam,
  ImagingReport,
  ImagingRequest,
  ImagingRequestDetail,
  ImagingStudy,
  SaveDraftBody,
} from '@/types/ris';

/** 前端生成检查申请单号：RQ + 时间戳后 8 位 + 随机 4 位。 */
export function genRequestNo(): string {
  return 'RQ' + Date.now().toString().slice(-8) + crypto.randomUUID().slice(0, 4);
}

/** 前端生成预约号：RA + 时间戳后 8 位 + 随机 4 位（契约第 5 节）。 */
export function genAppointmentNo(): string {
  return 'RA' + Date.now().toString().slice(-8) + crypto.randomUUID().slice(0, 4);
}

/** 前端生成报告号：RR + 时间戳后 8 位 + 随机 4 位（契约第 5 节）。 */
export function genReportNo(): string {
  return 'RR' + Date.now().toString().slice(-8) + crypto.randomUUID().slice(0, 4);
}

/* ------------------------------ 目录（6） ------------------------------ */

/** 检查项目列表。GET /ris/catalog/exams */
export function listExams(): Promise<ImagingExam[]> {
  return get<ImagingExam[]>('/ris/catalog/exams');
}

/** 设备列表。GET /ris/catalog/devices */
export function listDevices(): Promise<ImagingDevice[]> {
  return get<ImagingDevice[]>('/ris/catalog/devices');
}

/** 建检查项目。POST /ris/catalog/exams */
export function createExam(body: Partial<ImagingExam>): Promise<ImagingExam> {
  return post<ImagingExam>('/ris/catalog/exams', body);
}

/** 建设备。POST /ris/catalog/devices */
export function createDevice(body: Partial<ImagingDevice>): Promise<ImagingDevice> {
  return post<ImagingDevice>('/ris/catalog/devices', body);
}

/** 排时段。POST /ris/catalog/slots */
export function createSlot(body: CreateSlotBody): Promise<ImagingDeviceSlot> {
  return post<ImagingDeviceSlot>('/ris/catalog/slots', body);
}

/** 时段列表。GET /ris/catalog/slots?deviceId=&date= */
export function listSlots(query?: {
  deviceId?: string;
  date?: string;
}): Promise<ImagingDeviceSlot[]> {
  const qs: string[] = [];
  if (query?.deviceId) qs.push(`deviceId=${encodeURIComponent(query.deviceId)}`);
  if (query?.date) qs.push(`date=${encodeURIComponent(query.date)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<ImagingDeviceSlot[]>(`/ris/catalog/slots${suffix}`);
}

/* ------------------------------ 申请（4） ------------------------------ */

/** 建检查申请。POST /ris/requests */
export function createImagingRequest(body: CreateImagingRequestBody): Promise<ImagingRequest> {
  return post<ImagingRequest>('/ris/requests', body);
}

/** 申请列表。GET /ris/requests */
export function listImagingRequests(query?: {
  status?: string;
  patientId?: string;
  visitId?: string;
}): Promise<ImagingRequest[]> {
  const qs: string[] = [];
  if (query?.status) qs.push(`status=${encodeURIComponent(query.status)}`);
  if (query?.patientId) qs.push(`patientId=${encodeURIComponent(query.patientId)}`);
  if (query?.visitId) qs.push(`visitId=${encodeURIComponent(query.visitId)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<ImagingRequest[]>(`/ris/requests${suffix}`);
}

/** 申请详情（含 items / appointments / studies / reports）。GET /ris/requests/:id */
export function getImagingRequestDetail(id: string): Promise<ImagingRequestDetail> {
  return get<ImagingRequestDetail>(`/ris/requests/${id}`);
}

/** 取消申请。POST /ris/requests/:id/cancel */
export function cancelImagingRequest(id: string, reason: string): Promise<ImagingRequest> {
  return post<ImagingRequest>(`/ris/requests/${id}/cancel`, { reason });
}

/* ------------------------------ 预约（4） ------------------------------ */

/** 建预约。POST /ris/appointments */
export function createAppointment(body: CreateAppointmentBody): Promise<ImagingAppointment> {
  return post<ImagingAppointment>('/ris/appointments', body);
}

/** 预约列表。GET /ris/appointments */
export function listAppointments(query?: {
  status?: string;
  requestId?: string;
}): Promise<ImagingAppointment[]> {
  const qs: string[] = [];
  if (query?.status) qs.push(`status=${encodeURIComponent(query.status)}`);
  if (query?.requestId) qs.push(`requestId=${encodeURIComponent(query.requestId)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<ImagingAppointment[]>(`/ris/appointments${suffix}`);
}

/** 到检登记。POST /ris/appointments/:id/checkin */
export function checkinAppointment(id: string): Promise<ImagingAppointment> {
  return post<ImagingAppointment>(`/ris/appointments/${id}/checkin`);
}

/** 取消预约。POST /ris/appointments/:id/cancel */
export function cancelAppointment(id: string): Promise<ImagingAppointment> {
  return post<ImagingAppointment>(`/ris/appointments/${id}/cancel`);
}

/* ------------------------------ 检查执行（3） ------------------------------ */

/** 技师执行检查（生成 study）。POST /ris/appointments/:id/perform */
export function performAppointment(id: string, studyUid: string): Promise<ImagingStudy> {
  return post<ImagingStudy>(`/ris/appointments/${id}/perform`, { studyUid });
}

/** Study 列表。GET /ris/studies */
export function listStudies(): Promise<ImagingStudy[]> {
  return get<ImagingStudy[]>('/ris/studies');
}

/** 登记图像引用。POST /ris/studies/:id/images */
export function addStudyImages(studyId: string, body: AddImagesBody): Promise<ImagingStudy> {
  return post<ImagingStudy>(`/ris/studies/${studyId}/images`, body);
}

/* ------------------------------ 报告（9） ------------------------------ */

/** 建草稿报告（study 已 performed 才可建）。POST /ris/studies/:id/report */
export function createStudyReport(studyId: string, reportNo: string): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/studies/${studyId}/report`, { reportNo });
}

/** 报告列表。GET /ris/reports */
export function listReports(query?: {
  status?: string;
  patientId?: string;
  visitId?: string;
}): Promise<ImagingReport[]> {
  const qs: string[] = [];
  if (query?.status) qs.push(`status=${encodeURIComponent(query.status)}`);
  if (query?.patientId) qs.push(`patientId=${encodeURIComponent(query.patientId)}`);
  if (query?.visitId) qs.push(`visitId=${encodeURIComponent(query.visitId)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<ImagingReport[]>(`/ris/reports${suffix}`);
}

/** 保存草稿 findings/impression。POST /ris/reports/:id/draft */
export function saveReportDraft(reportId: string, body: SaveDraftBody): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/reports/${reportId}/draft`, body);
}

/** AI 辅助（结果只写 ai_findings，供医师采纳）。POST /ris/reports/:id/ai-assist */
export function aiAssistReport(reportId: string): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/reports/${reportId}/ai-assist`);
}

/** 提交审核（draft/returned→reviewing）。POST /ris/reports/:id/submit */
export function submitReport(id: string): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/reports/${id}/submit`);
}

/** 审核通过（职责分离，自审被后端 409 拒）。POST /ris/reports/:id/approve */
export function approveReport(id: string): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/reports/${id}/approve`);
}

/** 退回（须有原因）。POST /ris/reports/:id/return */
export function returnReport(id: string, reason: string): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/reports/${id}/return`, { reason });
}

/** 发布（approved→published）。POST /ris/reports/:id/publish */
export function publishReport(id: string): Promise<ImagingReport> {
  return post<ImagingReport>(`/ris/reports/${id}/publish`);
}

/** 报告详情（含 results/ai_findings/image_refs）。GET /ris/reports/:id */
export function getReportDetail(id: string): Promise<ImagingReport> {
  return get<ImagingReport>(`/ris/reports/${id}`);
}
