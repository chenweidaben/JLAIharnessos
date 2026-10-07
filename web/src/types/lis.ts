/**
 * 健澜科技 jlmedaios - LIS 检验全流程类型（M11-A）
 *
 * 严格对齐冻结设计契约第 1 节（目录 / 申请 / 标本 / 报告 / 结果）与第 4 节端点。
 * 状态枚举与契约 CHECK 约束一一对应。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

/** 申请单状态（契约 lab_requests.status） */
export type LabRequestStatus =
  | 'requested'
  | 'accepted'
  | 'specimen_collected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** 标本状态（契约 lab_specimens.status） */
export type SpecimenStatus = 'registered' | 'collected' | 'received' | 'rejected' | 'tested';

/** 报告状态（契约 lab_reports.status） */
export type ReportStatus = 'draft' | 'reviewing' | 'approved' | 'published' | 'returned';

/** 结果异常标志（契约规则引擎 evaluateItem） */
export type AbnormalFlag = 'H' | 'L' | 'HH' | 'LL' | 'N';

/** 紧急度（契约 lab_requests.urgency） */
export type Urgency = 'routine' | 'urgent' | 'stat';

/* ------------------------------ 目录 ------------------------------ */

/** 检验项目目录 clinical.lab_items */
export interface LabItem {
  id: string;
  code: string;
  name: string;
  specimenType: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  critLow: number | null;
  critHigh: number | null;
  execDepartment: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 检验面板目录 clinical.lab_panels（面板列表端点内含其 items） */
export interface LabPanel {
  id: string;
  code: string;
  name: string;
  specimenType: string | null;
  execDepartment: string;
  price: number;
  isActive: boolean;
  items?: LabItem[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ 申请 ------------------------------ */

/** 申请项目行 clinical.lab_request_items（panelId / itemId 至少其一） */
export interface LabRequestItem {
  id: string;
  requestId: string;
  panelId: string | null;
  itemId: string | null;
  createdAt: string;
}

/** 检验申请单 clinical.lab_requests */
export interface LabRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  orderedBy: string | null;
  urgency: Urgency;
  diagnosis: string | null;
  note: string | null;
  status: LabRequestStatus;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 申请详情（含 items / specimens / reports）：GET /lab/requests/:id */
export interface LabRequestDetail extends LabRequest {
  items: LabRequestItem[];
  specimens: LabSpecimen[];
  reports: LabReport[];
}

/* ------------------------------ 标本 ------------------------------ */

/** 标本 clinical.lab_specimens */
export interface LabSpecimen {
  id: string;
  specimenNo: string;
  requestId: string;
  visitId: string;
  patientId: string;
  panelId: string | null;
  specimenType: string;
  status: SpecimenStatus;
  collectedBy: string | null;
  collectedAt: string | null;
  collectionSite: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ 报告 / 结果 ------------------------------ */

/** 结果行 clinical.lab_results（扩展后） */
export interface LabResultRow {
  id: string;
  reportId: string;
  requestId: string | null;
  specimenId: string | null;
  itemId: string;
  itemCode: string | null;
  itemName: string | null;
  unit: string | null;
  value: string;
  numericValue: number | null;
  abnormalFlag: AbnormalFlag;
  isCritical: boolean;
  enteredBy: string | null;
  createdAt: string;
}

/** 检验报告 clinical.lab_reports（详情端点内含 results 明细） */
export interface LabReport {
  id: string;
  reportNo: string;
  requestId: string;
  visitId: string;
  patientId: string;
  specimenId: string | null;
  panelId: string | null;
  panelName: string | null;
  status: ReportStatus;
  enteredBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
  returnReason: string | null;
  reportTime: string | null;
  results?: LabResultRow[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ 请求体 ------------------------------ */

/** 申请项目选择：面板或单项（契约 items:[{panelId?}|{itemId?}]） */
export interface LabOrderItem {
  panelId?: string;
  itemId?: string;
}

/** POST /lab/requests 请求体（requestNo 由前端生成） */
export interface CreateRequestBody {
  requestNo: string;
  visitId: string;
  patientId: string;
  urgency: Urgency;
  diagnosis?: string;
  note?: string;
  items: LabOrderItem[];
}

/** POST /lab/reports/:id/results 请求体 */
export interface EnterResultsBody {
  results: { itemId: string; value: string }[];
}
