/**
 * 健澜科技 jlmedaios - LIS 检验全流程聚合器（M11-A）
 *
 * 申请 → 标本采集/签收 → 结果录入 → 报告提交/审核/退回/发布全闭环。
 * 规则判定（参考范围/异常/危急值/状态机/职责分离）全部委托确定性规则引擎，
 * 本层负责取数、FOR UPDATE 状态校验、权限、同事务危急值扫描与哈希链审计。
 *
 * AI 不自主出报告：结果由检验技师录入，报告须另一资质人员审核、电子签名后方可发布。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as crypto from 'node:crypto';

import type { AuthView } from '../view/userView.js';
import { withTx, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { scanAndRaise } from '../../db/repositories/criticalValueRepo.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import {
  SPECIMEN_TRANSITIONS,
  REPORT_TRANSITIONS,
  canTransition,
  evaluateItem,
  assertSeparation,
} from '../../medical-tools/lab/lisWorkflow.js';
import {
  createPanel,
  createItem,
  addItemToPanel,
  listPanels,
  listItems,
  getPanelById,
  getItemsByPanel,
  createRequest,
  addRequestItem,
  getRequestById,
  lockRequestById,
  getRequestItems,
  listRequests,
  patchRequest,
  insertSpecimen,
  lockSpecimenById,
  patchSpecimen,
  listSpecimens,
  createReport,
  getReportById,
  lockReportById,
  patchReport,
  getReportsByRequest,
  listReports,
  upsertResult,
  getResultsByReport,
  type LabPanelDetail,
  type LabItem,
  type LabRequest,
  type LabRequestItem,
  type LabSpecimen,
  type LabReport,
  type LabResultRow,
} from '../../db/repositories/lisRepo.js';

export class LisError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LisError';
  }
}
const badRequest = (m: string) => new LisError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new LisError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new LisError(409, 'CONFLICT', m);
const forbidden = (m: string) => new LisError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string | undefined | null, label: string): asserts id is string {
  if (!id || !UUID_RE.test(String(id).trim())) throw badRequest(`${label} 须为用户 UUID`);
}

const URGENCIES = ['routine', 'urgent', 'stat'];

/** 单号生成（聚合器侧，非纯函数）：前缀 + 时间基36 + 4 位随机段。 */
function genNo(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;
}

// ---------------------------------------------------------------------------
// 目录
// ---------------------------------------------------------------------------

export async function listPanelsView(): Promise<LabPanelDetail[]> {
  return listPanels();
}

export async function listItemsView(): Promise<LabItem[]> {
  return listItems();
}

export async function createPanelCatalog(
  auth: AuthView,
  input: { code: string; name: string; specimenType?: string | null; price?: number },
): Promise<{ panel: LabPanelDetail; created: boolean }> {
  assertPermission(auth, 'lis:catalog');
  if (!input.code?.trim()) throw badRequest('面板编码不能为空');
  if (!input.name?.trim()) throw badRequest('面板名称不能为空');
  return withTx(async (tx) => {
    const { panel, created } = await createPanel(
      { code: input.code.trim(), name: input.name.trim(), specimenType: input.specimenType ?? null, price: input.price },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'lis.catalog', resourceType: 'lab_panel', resourceId: panel.id,
      result: 'success', riskLevel: 'low', detail: { code: panel.code, created },
    }, tx);
    const items = await getItemsByPanel(panel.id, tx);
    return { panel: { ...panel, items }, created };
  });
}

export async function createItemCatalog(
  auth: AuthView,
  input: {
    code: string; name: string; unit?: string | null;
    refLow?: number | null; refHigh?: number | null;
    critLow?: number | null; critHigh?: number | null;
    price?: number;
  },
): Promise<{ item: LabItem; created: boolean }> {
  assertPermission(auth, 'lis:catalog');
  if (!input.code?.trim()) throw badRequest('项目编码不能为空');
  if (!input.name?.trim()) throw badRequest('项目名称不能为空');
  return withTx(async (tx) => {
    const { item, created } = await createItem(
      {
        code: input.code.trim(), name: input.name.trim(), unit: input.unit ?? null,
        refLow: input.refLow ?? null, refHigh: input.refHigh ?? null,
        critLow: input.critLow ?? null, critHigh: input.critHigh ?? null, price: input.price,
      },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'lis.catalog', resourceType: 'lab_item', resourceId: item.id,
      result: 'success', riskLevel: 'low', detail: { code: item.code, created },
    }, tx);
    return { item, created };
  });
}

export async function attachItemToPanel(
  auth: AuthView,
  panelId: string,
  itemId: string,
): Promise<void> {
  assertPermission(auth, 'lis:catalog');
  assertUuid(panelId, '面板');
  assertUuid(itemId, '项目');
  return withTx(async (tx) => {
    const panel = await getPanelById(panelId, tx);
    if (!panel) throw notFound('检验面板不存在');
    await addItemToPanel(panelId, itemId, 0, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.catalog', resourceType: 'lab_panel', resourceId: panelId,
      result: 'success', riskLevel: 'low', detail: { attachedItem: itemId },
    }, tx);
  });
}

// ---------------------------------------------------------------------------
// 检验申请
// ---------------------------------------------------------------------------

export interface LabRequestLine {
  panelId?: string | null;
  itemId?: string | null;
}

export async function createLabRequest(
  auth: AuthView,
  input: {
    requestNo: string;
    visitId: string;
    urgency?: string;
    diagnosis?: string | null;
    note?: string | null;
    items: LabRequestLine[];
  },
): Promise<{ req: LabRequest; created: boolean; items: LabRequestItem[] }> {
  assertPermission(auth, 'lis:request');
  if (!input.requestNo?.trim()) throw badRequest('申请单号不能为空');
  assertUuid(input.visitId, '就诊');
  const urgency = input.urgency ?? 'routine';
  if (!URGENCIES.includes(urgency)) throw badRequest('紧急度须为 routine/urgent/stat');
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest('申请项目不能为空');
  }
  for (const line of input.items) {
    if (!line.panelId && !line.itemId) throw badRequest('申请项目须指定面板或单项目');
    if (line.panelId) assertUuid(line.panelId, '面板');
    if (line.itemId) assertUuid(line.itemId, '项目');
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
        note: input.note ?? null,
      },
      tx,
    );
    if (created) {
      for (const line of input.items) {
        await addRequestItem(
          { requestId: req.id, panelId: line.panelId ?? null, itemId: line.itemId ?? null },
          tx,
        );
      }
    }
    const items = await getRequestItems(req.id, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.request', resourceType: 'lab_request', resourceId: req.id,
      result: 'success', riskLevel: 'low',
      detail: { requestNo: req.requestNo, created, lineCount: items.length },
    }, tx);
    return { req, created, items };
  });
}

export async function listLabRequestsView(filter: {
  status?: string; patientId?: string; visitId?: string;
}): Promise<LabRequest[]> {
  if (filter.patientId) assertUuid(filter.patientId, '患者');
  if (filter.visitId) assertUuid(filter.visitId, '就诊');
  return listRequests(filter);
}

export async function getLabRequestDetail(requestId: string) {
  assertUuid(requestId, '检验申请');
  const req = await getRequestById(requestId);
  if (!req) throw notFound('检验申请不存在');
  const [items, specimens, reports] = await Promise.all([
    getRequestItems(requestId),
    listSpecimens({ requestId }),
    getReportsByRequest(requestId),
  ]);
  return { req, items, specimens, reports };
}

export async function cancelLabRequest(
  auth: AuthView,
  requestId: string,
  input: { reason: string },
): Promise<LabRequest> {
  assertPermission(auth, 'lis:request');
  assertUuid(requestId, '检验申请');
  if (!input.reason?.trim()) throw badRequest('取消原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockRequestById(requestId, tx);
    if (!locked) throw notFound('检验申请不存在');
    if (!['requested', 'accepted'].includes(locked.status)) {
      throw conflict(`当前状态（${locked.status}）不可取消`);
    }
    const updated = await patchRequest(requestId, {
      status: 'cancelled',
      cancelled_by: auth.id,
      cancelled_at: new Date().toISOString(),
      cancel_reason: input.reason.trim(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.request', resourceType: 'lab_request', resourceId: requestId,
      result: 'success', riskLevel: 'low', detail: { cancel: true, reason: input.reason.trim() },
    }, tx);
    return updated;
  });
}

// ---------------------------------------------------------------------------
// 标本
// ---------------------------------------------------------------------------

/** 按申请面板展开生成标本条码（一面板一标本，幂等）。生成后申请流转为 accepted。 */
export async function generateSpecimens(
  auth: AuthView,
  requestId: string,
): Promise<{ specimens: LabSpecimen[]; created: boolean }> {
  assertPermission(auth, 'lis:receive');
  assertUuid(requestId, '检验申请');
  return withTx(async (tx) => {
    const locked = await lockRequestById(requestId, tx);
    if (!locked) throw notFound('检验申请不存在');
    if (locked.status === 'cancelled') throw conflict('申请已取消，不能生成标本');

    const existing = await listSpecimens({ requestId }, tx);
    if (existing.length > 0) return { specimens: existing, created: false };

    const lines = await getRequestItems(requestId, tx);
    const panelIds = Array.from(new Set(
      lines.map((l) => l.panelId).filter((p): p is string => !!p),
    ));
    if (panelIds.length === 0) throw badRequest('申请未包含面板，无法生成标本');

    const created: LabSpecimen[] = [];
    for (const panelId of panelIds) {
      const panel = await getPanelById(panelId, tx);
      if (!panel) throw notFound(`面板不存在：${panelId}`);
      created.push(await insertSpecimen({
        specimenNo: genNo('SM'),
        requestId: locked.id,
        visitId: locked.visitId,
        patientId: locked.patientId,
        panelId,
        specimenType: panel.specimenType ?? '未指定',
      }, tx));
    }

    let nextStatus = locked.status;
    if (locked.status === 'requested') nextStatus = 'accepted';
    if (nextStatus !== locked.status) await patchRequest(requestId, { status: nextStatus }, tx);

    await recordChainAudit({
      actorId: auth.id, action: 'lis.receive', resourceType: 'lab_request', resourceId: requestId,
      result: 'success', riskLevel: 'low', detail: { phase: 'register', generated: created.length },
    }, tx);
    return { specimens: created, created: true };
  });
}

export async function listSpecimensView(filter: {
  status?: string; requestId?: string;
}): Promise<LabSpecimen[]> {
  if (filter.requestId) assertUuid(filter.requestId, '检验申请');
  return listSpecimens(filter);
}

async function advanceRequest(
  tx: DbExecutor,
  requestId: string,
  to: string,
  allowedFrom: string[],
): Promise<void> {
  const locked = await lockRequestById(requestId, tx);
  if (!locked) return;
  if (allowedFrom.includes(locked.status) && locked.status !== to) {
    await patchRequest(requestId, { status: to }, tx);
  }
}

export async function collectSpecimen(
  auth: AuthView,
  specimenId: string,
  input: { collectionSite?: string },
): Promise<LabSpecimen> {
  assertPermission(auth, 'lis:collect');
  assertUuid(specimenId, '标本');
  return withTx(async (tx) => {
    const locked = await lockSpecimenById(specimenId, tx);
    if (!locked) throw notFound('标本不存在');
    if (!canTransition(SPECIMEN_TRANSITIONS, locked.status as never, 'collected')) {
      throw conflict(`标本状态（${locked.status}）不能采集`);
    }
    const updated = await patchSpecimen(specimenId, {
      status: 'collected',
      collected_by: auth.id,
      collected_at: new Date().toISOString(),
      collection_site: input.collectionSite ?? null,
    }, tx);
    await advanceRequest(tx, locked.requestId, 'specimen_collected', ['requested', 'accepted']);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.collect', resourceType: 'lab_specimen', resourceId: specimenId,
      result: 'success', riskLevel: 'low', detail: { specimenNo: locked.specimenNo },
    }, tx);
    return updated;
  });
}

export async function receiveSpecimen(auth: AuthView, specimenId: string): Promise<LabSpecimen> {
  assertPermission(auth, 'lis:receive');
  assertUuid(specimenId, '标本');
  return withTx(async (tx) => {
    const locked = await lockSpecimenById(specimenId, tx);
    if (!locked) throw notFound('标本不存在');
    if (!canTransition(SPECIMEN_TRANSITIONS, locked.status as never, 'received')) {
      throw conflict(`标本状态（${locked.status}）不能签收`);
    }
    const updated = await patchSpecimen(specimenId, {
      status: 'received',
      received_by: auth.id,
      received_at: new Date().toISOString(),
    }, tx);
    await advanceRequest(tx, locked.requestId, 'in_progress', ['accepted', 'specimen_collected']);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.receive', resourceType: 'lab_specimen', resourceId: specimenId,
      result: 'success', riskLevel: 'low', detail: { specimenNo: locked.specimenNo },
    }, tx);
    return updated;
  });
}

export async function rejectSpecimen(
  auth: AuthView,
  specimenId: string,
  input: { reason: string },
): Promise<LabSpecimen> {
  assertPermission(auth, 'lis:receive');
  assertUuid(specimenId, '标本');
  if (!input.reason?.trim()) throw badRequest('拒收原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockSpecimenById(specimenId, tx);
    if (!locked) throw notFound('标本不存在');
    if (!canTransition(SPECIMEN_TRANSITIONS, locked.status as never, 'rejected')) {
      throw conflict(`标本状态（${locked.status}）不能拒收`);
    }
    const updated = await patchSpecimen(specimenId, {
      status: 'rejected',
      rejected_by: auth.id,
      rejected_at: new Date().toISOString(),
      reject_reason: input.reason.trim(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.receive', resourceType: 'lab_specimen', resourceId: specimenId,
      result: 'success', riskLevel: 'low',
      detail: { specimenNo: locked.specimenNo, rejected: true, reason: input.reason.trim() },
    }, tx);
    return updated;
  });
}

// ---------------------------------------------------------------------------
// 报告与结果
// ---------------------------------------------------------------------------

export async function createLabReport(
  auth: AuthView,
  requestId: string,
  input: { panelId: string },
): Promise<{ report: LabReport; created: boolean }> {
  assertPermission(auth, 'lis:enter');
  assertUuid(requestId, '检验申请');
  assertUuid(input.panelId, '面板');
  return withTx(async (tx) => {
    const locked = await lockRequestById(requestId, tx);
    if (!locked) throw notFound('检验申请不存在');
    if (locked.status === 'cancelled') throw conflict('申请已取消，不能建报告');
    const panel = await getPanelById(input.panelId, tx);
    if (!panel) throw notFound('检验面板不存在');
    const specimens = await listSpecimens({ requestId }, tx);
    const specimen = specimens.find((s) => s.panelId === input.panelId) ?? null;
    if (!specimen) throw conflict('尚未生成该面板的标本，不能建报告');

    const { report, created } = await createReport(
      {
        reportNo: genNo('LR'),
        requestId: locked.id,
        visitId: locked.visitId,
        patientId: locked.patientId,
        specimenId: specimen.id,
        panelId: panel.id,
        panelName: panel.name,
        enteredBy: auth.id,
      },
      tx,
    );
    await recordChainAudit({
      actorId: auth.id, action: 'lis.enter', resourceType: 'lab_report', resourceId: report.id,
      result: 'success', riskLevel: 'low',
      detail: { step: 'draft', reportNo: report.reportNo, created },
    }, tx);
    return { report, created };
  });
}

export async function enterResults(
  auth: AuthView,
  reportId: string,
  input: { results: { itemId: string; value: string | number }[] },
): Promise<{ report: LabReport; results: LabResultRow[]; criticalCount: number }> {
  assertPermission(auth, 'lis:enter');
  assertUuid(reportId, '报告');
  if (!Array.isArray(input.results) || input.results.length === 0) {
    throw badRequest('结果列表不能为空');
  }
  return withTx(async (tx) => {
    const locked = await lockReportById(reportId, tx);
    if (!locked) throw notFound('检验报告不存在');
    if (!['draft', 'returned'].includes(locked.status)) {
      throw conflict(`报告状态（${locked.status}）不能录入结果`);
    }
    if (!locked.panelId) throw badRequest('报告未关联面板');

    const panelItems = await getItemsByPanel(locked.panelId, tx);
    const itemMap = new Map<string, LabItem>();
    for (const it of panelItems) itemMap.set(it.id, it);

    // 标本须已签收后方可上机录入；重复录入时允许 tested 状态继续覆盖
    let specimenType: string | null = null;
    if (locked.specimenId) {
      const specimen = await lockSpecimenById(locked.specimenId, tx);
      if (!specimen) throw notFound('报告关联标本不存在');
      if (!['received', 'tested'].includes(specimen.status)) {
        throw conflict(`标本状态（${specimen.status}）未签收，不能录入结果`);
      }
      specimenType = specimen.specimenType;
      if (specimen.status === 'received') {
        await patchSpecimen(specimen.id, { status: 'tested' }, tx);
      }
    }

    const out: LabResultRow[] = [];
    const resultIds: string[] = [];
    let criticalCount = 0;
    for (const entry of input.results) {
      assertUuid(entry.itemId, '项目');
      const item = itemMap.get(entry.itemId);
      if (!item) throw badRequest(`项目不属于本报告面板：${entry.itemId}`);
      const evaluated = evaluateItem(
        { refLow: item.refLow, refHigh: item.refHigh, critLow: item.critLow, critHigh: item.critHigh },
        String(entry.value),
      );
      if (evaluated.isCritical) criticalCount += 1;
      const { result } = await upsertResult(
        {
          reportId: locked.id,
          requestId: locked.requestId,
          specimenId: locked.specimenId,
          visitId: locked.visitId,
          patientId: locked.patientId,
          reportNo: locked.reportNo,
          panelName: locked.panelName,
          specimenType,
          itemCode: item.code,
          itemName: item.name,
          unit: item.unit,
          value: evaluated.value,
          numericValue: evaluated.numericValue,
          refLow: item.refLow,
          refHigh: item.refHigh,
          abnormalFlag: evaluated.abnormalFlag,
          isCritical: evaluated.isCritical,
          enteredBy: auth.id,
        },
        tx,
      );
      out.push(result);
      resultIds.push(result.id);
    }

    // 同事务触发危急值扫描上报（复用既有危急值闭环，不重复造轮子）
    if (resultIds.length > 0) {
      await scanAndRaise(tx, { labResultIds: resultIds });
    }

    await recordChainAudit({
      actorId: auth.id, action: 'lis.enter', resourceType: 'lab_report', resourceId: reportId,
      result: 'success', riskLevel: 'medium',
      detail: { count: out.length, critical: criticalCount },
    }, tx);
    return { report: locked, results: out, criticalCount };
  });
}

export async function submitReport(auth: AuthView, reportId: string): Promise<LabReport> {
  assertPermission(auth, 'lis:enter');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockReportById(reportId, tx);
    if (!locked) throw notFound('检验报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'reviewing')) {
      throw conflict(`报告状态（${locked.status}）不能提交审核`);
    }
    // 医疗安全：报告须已录入结果（结果录入本身要求标本已签收），杜绝空报告/未签收标本进入审核发布
    const existingResults = await getResultsByReport(reportId, tx);
    if (existingResults.length === 0) {
      throw conflict('报告尚未录入任何结果，不能提交审核');
    }
    const updated = await patchReport(reportId, { status: 'reviewing' }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.submit', resourceType: 'lab_report', resourceId: reportId,
      result: 'success', riskLevel: 'low', detail: { from: locked.status, to: 'reviewing' },
    }, tx);
    return updated;
  });
}

export async function approveReport(auth: AuthView, reportId: string): Promise<LabReport> {
  assertPermission(auth, 'lis:review');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockReportById(reportId, tx);
    if (!locked) throw notFound('检验报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'approved')) {
      throw conflict(`报告状态（${locked.status}）不能审核通过`);
    }
    // 职责分离：录入人不得审核自己的报告
    if (locked.enteredBy && !assertSeparation(locked.enteredBy, auth.id)) {
      throw conflict('录入人与审核人不能为同一人，须职责分离');
    }
    const updated = await patchReport(reportId, {
      status: 'approved', reviewed_by: auth.id, reviewed_at: new Date().toISOString(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.approve', resourceType: 'lab_report', resourceId: reportId,
      result: 'success', riskLevel: 'medium', detail: { from: 'reviewing', to: 'approved' },
    }, tx);
    return updated;
  });
}

export async function returnReport(
  auth: AuthView,
  reportId: string,
  input: { reason: string },
): Promise<LabReport> {
  assertPermission(auth, 'lis:review');
  assertUuid(reportId, '报告');
  if (!input.reason?.trim()) throw badRequest('退回原因不能为空');
  return withTx(async (tx) => {
    const locked = await lockReportById(reportId, tx);
    if (!locked) throw notFound('检验报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'returned')) {
      throw conflict(`报告状态（${locked.status}）不能退回`);
    }
    const updated = await patchReport(reportId, {
      status: 'returned', returned_by: auth.id, returned_at: new Date().toISOString(),
      return_reason: input.reason.trim(),
    }, tx);
    await recordChainAudit({
      actorId: auth.id, action: 'lis.return', resourceType: 'lab_report', resourceId: reportId,
      result: 'success', riskLevel: 'low',
      detail: { reason: input.reason.trim() },
    }, tx);
    return updated;
  });
}

export async function publishReport(auth: AuthView, reportId: string): Promise<LabReport> {
  assertPermission(auth, 'lis:publish');
  assertUuid(reportId, '报告');
  return withTx(async (tx) => {
    const locked = await lockReportById(reportId, tx);
    if (!locked) throw notFound('检验报告不存在');
    if (!canTransition(REPORT_TRANSITIONS, locked.status as never, 'published')) {
      throw conflict(`报告状态（${locked.status}）不能发布`);
    }
    const updated = await patchReport(reportId, {
      status: 'published',
      published_by: auth.id,
      published_at: new Date().toISOString(),
      report_time: new Date().toISOString(),
    }, tx);
    // 申请下全部报告发布后，申请流转为 completed
    const reports = await getReportsByRequest(locked.requestId, tx);
    if (reports.length > 0 && reports.every((r) => r.status === 'published')) {
      const req = await lockRequestById(locked.requestId, tx);
      if (req && req.status !== 'completed' && req.status !== 'cancelled') {
        await patchRequest(locked.requestId, { status: 'completed' }, tx);
      }
    }
    await recordChainAudit({
      actorId: auth.id, action: 'lis.publish', resourceType: 'lab_report', resourceId: reportId,
      result: 'success', riskLevel: 'medium', detail: { from: 'approved', to: 'published' },
    }, tx);
    return updated;
  });
}

export async function listReportsView(filter: {
  status?: string; patientId?: string; visitId?: string;
}): Promise<LabReport[]> {
  if (filter.patientId) assertUuid(filter.patientId, '患者');
  if (filter.visitId) assertUuid(filter.visitId, '就诊');
  return listReports(filter);
}

export async function getReportDetail(reportId: string) {
  assertUuid(reportId, '报告');
  const report = await getReportById(reportId);
  if (!report) throw notFound('检验报告不存在');
  const results = await getResultsByReport(reportId);
  return { report, results };
}
