/**
 * 健澜科技 jlmedaios - RIS/PACS 检查全流程类型（M11-B）
 *
 * 严格对齐冻结设计契约第 1 节（目录 / 申请 / 预约 / 执行 / 报告）与第 4 节端点。
 * 状态枚举与契约 CHECK 约束一一对应。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

/** 检查申请状态（契约 imaging_requests.status） */
export type ImagingRequestStatus =
  | 'requested'
  | 'scheduled'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** 预约状态（契约 imaging_appointments.status） */
export type ImagingAppointmentStatus = 'booked' | 'arrived' | 'done' | 'cancelled' | 'no_show';

/** 报告状态（契约 imaging_reports.status） */
export type ImagingReportStatus = 'draft' | 'reviewing' | 'approved' | 'published' | 'returned';

/** 检查模态（契约 imaging_exams/imaging_devices modality CHECK） */
export type Modality = 'CR' | 'DX' | 'CT' | 'MR' | 'US' | 'XA' | 'PT' | 'NM' | 'MG';

/** 紧急度（契约 imaging_requests.urgency） */
export type Urgency = 'routine' | 'urgent' | 'stat';

/** 危急/异常标志（契约 imaging_reports.is_critical） */
export type CriticalFlag = boolean;

/* ------------------------------ 目录 ------------------------------ */

/** 检查项目目录 clinical.imaging_exams */
export interface ImagingExam {
  id: string;
  examCode: string;
  name: string;
  modality: Modality;
  bodyPart: string | null;
  execDepartment: string;
  defaultDeviceId: string | null;
  price: number;
  needsScheduling: boolean;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 检查设备 clinical.imaging_devices */
export interface ImagingDevice {
  id: string;
  deviceCode: string;
  name: string;
  modality: Modality;
  room: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 设备时段排班 clinical.imaging_device_slots */
export interface ImagingDeviceSlot {
  id: string;
  deviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  createdAt: string;
}

/* ------------------------------ 申请 ------------------------------ */

/** 申请项目行 clinical.imaging_request_items */
export interface ImagingRequestItem {
  id: string;
  requestId: string;
  examId: string;
  createdAt: string;
}

/** 检查申请单 clinical.imaging_requests */
export interface ImagingRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  orderedBy: string | null;
  urgency: Urgency;
  diagnosis: string | null;
  chiefComplaint: string | null;
  status: ImagingRequestStatus;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 申请详情（含 items / appointments / studies / reports）：GET /ris/requests/:id */
export interface ImagingRequestDetail extends ImagingRequest {
  items: ImagingRequestItem[];
  appointments: ImagingAppointment[];
  studies: ImagingStudy[];
  reports: ImagingReport[];
}

/* ------------------------------ 预约 ------------------------------ */

/** 预约安排 clinical.imaging_appointments */
export interface ImagingAppointment {
  id: string;
  appointmentNo: string;
  requestId: string;
  examId: string;
  slotId: string;
  deviceId: string;
  scheduledStart: string;
  status: ImagingAppointmentStatus;
  checkedInAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ 检查执行 ------------------------------ */

/** 检查执行 / DICOM Study clinical.imaging_studies */
export interface ImagingStudy {
  id: string;
  studyUid: string;
  appointmentId: string;
  requestId: string;
  examId: string;
  deviceId: string;
  modality: Modality;
  status: 'performed';
  performedBy: string;
  performedAt: string;
  imageRefs: string[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ 报告 ------------------------------ */

/** 影像报告 clinical.imaging_reports（扩展后，详情端点内含 ai_findings/image_refs） */
export interface ImagingReport {
  id: string;
  reportNo: string | null;
  visitId: string;
  patientId: string;
  studyUid: string | null;
  modality: Modality | null;
  examName: string | null;
  bodyPart: string | null;
  findings: string | null;
  impression: string | null;
  aiFindings: string | null;
  isCritical: CriticalFlag;
  reportTime: string | null;
  imageRefs: string[];
  status: ImagingReportStatus;
  requestId: string | null;
  appointmentId: string | null;
  studyId: string | null;
  examId: string | null;
  writtenBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
  returnReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ 请求体 ------------------------------ */

/** POST /ris/requests 请求体（requestNo 由前端生成） */
export interface CreateImagingRequestBody {
  requestNo: string;
  visitId: string;
  patientId: string;
  urgency: Urgency;
  diagnosis?: string;
  chiefComplaint?: string;
  items: { examId: string }[];
}

/** POST /ris/catalog/slots 请求体 */
export interface CreateSlotBody {
  deviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

/** POST /ris/appointments 请求体（appointmentNo 由前端生成） */
export interface CreateAppointmentBody {
  appointmentNo: string;
  requestId: string;
  examId: string;
  slotId: string;
}

/** POST /ris/studies/:id/images 请求体 */
export interface AddImagesBody {
  imageRefs: string[];
}

/** POST /ris/reports/:id/draft 请求体 */
export interface SaveDraftBody {
  findings?: string;
  impression?: string;
}
