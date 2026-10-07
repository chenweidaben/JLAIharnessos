/**
 * 健澜科技 jlmedaios - LIS 检验全流程 API（M11-A）
 *
 * 与冻结设计契约第 4 节端点一一对应。全部使用相对路径 '/lab/...'
 * （axios 实例 baseURL=/api/v1，此处禁止再带 /api/v1 前缀，否则双前缀）。
 *
 * requestNo 由前端生成：'LR'+时间戳后8位+随机4位，保证并发下基本不冲突。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  CreateRequestBody,
  EnterResultsBody,
  LabItem,
  LabPanel,
  LabReport,
  LabRequest,
  LabRequestDetail,
  LabSpecimen,
} from '@/types/lis';

/** 前端生成检验申请单号：LR + 时间戳后 8 位 + 随机 4 位（契约第 5 节）。 */
export function genRequestNo(): string {
  return 'LR' + Date.now().toString().slice(-8) + crypto.randomUUID().slice(0, 4);
}

/* ------------------------------ 目录 ------------------------------ */

/** 面板列表（含其 items）。GET /lab/catalog/panels */
export function listPanels(): Promise<LabPanel[]> {
  return get<LabPanel[]>('/lab/catalog/panels');
}

/** 项目列表。GET /lab/catalog/items */
export function listItems(): Promise<LabItem[]> {
  return get<LabItem[]>('/lab/catalog/items');
}

/** 建面板。POST /lab/catalog/panels */
export function createPanel(body: Partial<LabPanel>): Promise<LabPanel> {
  return post<LabPanel>('/lab/catalog/panels', body);
}

/** 建项目。POST /lab/catalog/items */
export function createLabItem(body: Partial<LabItem>): Promise<LabItem> {
  return post<LabItem>('/lab/catalog/items', body);
}

/** 面板加项目。POST /lab/catalog/panels/:panelId/items */
export function addPanelItem(panelId: string, itemId: string): Promise<unknown> {
  return post(`/lab/catalog/panels/${panelId}/items`, { itemId });
}

/* ------------------------------ 申请 ------------------------------ */

/** 建申请。POST /lab/requests */
export function createRequest(body: CreateRequestBody): Promise<LabRequest> {
  return post<LabRequest>('/lab/requests', body);
}

/** 申请列表。GET /lab/requests */
export function listRequests(query?: {
  status?: string;
  patientId?: string;
  visitId?: string;
}): Promise<LabRequest[]> {
  const qs: string[] = [];
  if (query?.status) qs.push(`status=${encodeURIComponent(query.status)}`);
  if (query?.patientId) qs.push(`patientId=${encodeURIComponent(query.patientId)}`);
  if (query?.visitId) qs.push(`visitId=${encodeURIComponent(query.visitId)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<LabRequest[]>(`/lab/requests${suffix}`);
}

/** 申请详情（含 items / specimens / reports）。GET /lab/requests/:id */
export function getRequestDetail(id: string): Promise<LabRequestDetail> {
  return get<LabRequestDetail>(`/lab/requests/${id}`);
}

/** 取消申请。POST /lab/requests/:id/cancel */
export function cancelRequest(id: string, reason: string): Promise<LabRequest> {
  return post<LabRequest>(`/lab/requests/${id}/cancel`, { reason });
}

/* ------------------------------ 标本 ------------------------------ */

/** 按申请面板生成标本条码。POST /lab/requests/:id/specimens */
export function generateSpecimens(requestId: string): Promise<LabSpecimen[]> {
  return post<LabSpecimen[]>(`/lab/requests/${requestId}/specimens`);
}

/** 标本列表。GET /lab/specimens */
export function listSpecimens(query?: {
  status?: string;
  requestId?: string;
}): Promise<LabSpecimen[]> {
  const qs: string[] = [];
  if (query?.status) qs.push(`status=${encodeURIComponent(query.status)}`);
  if (query?.requestId) qs.push(`requestId=${encodeURIComponent(query.requestId)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<LabSpecimen[]>(`/lab/specimens${suffix}`);
}

/** 标本采集。POST /lab/specimens/:id/collect */
export function collectSpecimen(id: string, collectionSite: string): Promise<LabSpecimen> {
  return post<LabSpecimen>(`/lab/specimens/${id}/collect`, { collectionSite });
}

/** 标本签收。POST /lab/specimens/:id/receive */
export function receiveSpecimen(id: string): Promise<LabSpecimen> {
  return post<LabSpecimen>(`/lab/specimens/${id}/receive`);
}

/** 标本拒收。POST /lab/specimens/:id/reject */
export function rejectSpecimen(id: string, reason: string): Promise<LabSpecimen> {
  return post<LabSpecimen>(`/lab/specimens/${id}/reject`, { reason });
}

/* ------------------------------ 报告 / 结果 ------------------------------ */

/** 建草稿报告。POST /lab/requests/:id/reports */
export function createReport(requestId: string, panelId: string): Promise<LabReport> {
  return post<LabReport>(`/lab/requests/${requestId}/reports`, { panelId });
}

/** 结果录入（幂等覆盖）。POST /lab/reports/:id/results */
export function enterResults(reportId: string, body: EnterResultsBody): Promise<LabReport> {
  return post<LabReport>(`/lab/reports/${reportId}/results`, body);
}

/** 提交审核。POST /lab/reports/:id/submit */
export function submitReport(id: string): Promise<LabReport> {
  return post<LabReport>(`/lab/reports/${id}/submit`);
}

/** 审核通过（职责分离，自审被后端拒）。POST /lab/reports/:id/approve */
export function approveReport(id: string): Promise<LabReport> {
  return post<LabReport>(`/lab/reports/${id}/approve`);
}

/** 退回。POST /lab/reports/:id/return */
export function returnReport(id: string, reason: string): Promise<LabReport> {
  return post<LabReport>(`/lab/reports/${id}/return`, { reason });
}

/** 发布。POST /lab/reports/:id/publish */
export function publishReport(id: string): Promise<LabReport> {
  return post<LabReport>(`/lab/reports/${id}/publish`);
}

/** 报告列表。GET /lab/reports */
export function listReports(query?: {
  status?: string;
  patientId?: string;
  visitId?: string;
}): Promise<LabReport[]> {
  const qs: string[] = [];
  if (query?.status) qs.push(`status=${encodeURIComponent(query.status)}`);
  if (query?.patientId) qs.push(`patientId=${encodeURIComponent(query.patientId)}`);
  if (query?.visitId) qs.push(`visitId=${encodeURIComponent(query.visitId)}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';
  return get<LabReport[]>(`/lab/reports${suffix}`);
}

/** 报告详情（含 results 明细）。GET /lab/reports/:id */
export function getReportDetail(id: string): Promise<LabReport> {
  return get<LabReport>(`/lab/reports/${id}`);
}
