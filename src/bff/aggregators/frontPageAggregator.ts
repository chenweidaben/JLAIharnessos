/**
 * 健澜科技 jlmedaios - 病案首页聚合器（M3-A）
 *
 * 出院后自动汇聚出院病历成「病案首页」：诊断 / 手术操作 / 费用 / 入出院信息；
 *  1) 汇聚：从 visits/patients/diagnoses 组装，幂等（一个出院就诊一份首页）；
 *  2) 编码：病案室编码员本人填写 ICD 编码（draft/coding → coding）；
 *  3) 质控：第二人质控（pass/return），职责分离——编码员不能自审（403）；
 *  4) 归档：质控通过后归档（qc → archived）。
 *
 * 严谨性：
 *  - 纯函数完整性质检产出缺陷清单（必填项缺失 / 主诊断与手术操作匹配）；
 *  - 阻断/主要缺陷未显式确认时不得通过；
 *  - 业务写与审计哈希链（audit.audit_logs）在同一事务提交；
 *  - 质控结论由质控人本人签名，AI 仅辅助、不产生最终结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import { getDiagnosesByVisit, type Diagnosis } from '../../db/repositories/diagnosisRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type FrontPage,
  type FrontPageDefect,
  type FrontPageReview,
  type FrontPageStatus,
  type FrontPageQueueRow,
  upsertFrontPage,
  getFrontPageById,
  listFrontPages,
  transitionFrontPage,
  insertFrontPageReview,
  listReviewsByFrontPage,
} from '../../db/repositories/frontPageRepo.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class FrontPageError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FrontPageError';
  }
}
const badRequest = (m: string) => new FrontPageError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new FrontPageError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new FrontPageError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new FrontPageError(409, 'CONFLICT', m);

/* ------------------------------ 访问范围 ------------------------------ */

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

/* ------------------------ 纯函数：完整性质检 --------------------------- */

const SURGICAL_HINT = /切除术|置换术|修补|骨折|阑尾炎|胆囊|造瘘|移植|分流|固定术|摘除/;

/** 纯函数：对汇聚/编码后的首页做完整性质检，产出缺陷清单。 */
export function evaluateFrontPageDefects(f: {
  primaryDiagnosis?: string | null;
  primaryDiagnosisCode?: string | null;
  operations?: Array<Record<string, unknown>>;
  admitAt?: string | null;
  dischargeAt?: string | null;
}): FrontPageDefect[] {
  const defects: FrontPageDefect[] = [];
  if (!f.primaryDiagnosis || !f.primaryDiagnosis.trim()) {
    defects.push({ field: 'primaryDiagnosis', severity: 'block', message: '主诊断缺失' });
  } else if (!f.primaryDiagnosisCode || !f.primaryDiagnosisCode.trim()) {
    defects.push({ field: 'primaryDiagnosisCode', severity: 'major', message: '主诊断 ICD 编码缺失' });
  }
  if (!f.admitAt) defects.push({ field: 'admitAt', severity: 'major', message: '入院时间缺失' });
  if (!f.dischargeAt) defects.push({ field: 'dischargeAt', severity: 'major', message: '出院时间缺失' });
  if (
    f.primaryDiagnosis && SURGICAL_HINT.test(f.primaryDiagnosis.trim()) &&
    (!f.operations || f.operations.length === 0)
  ) {
    defects.push({
      field: 'operations',
      severity: 'major',
      message: '主诊断提示手术/操作，但手术操作记录为空，请核对补充',
    });
  }
  return defects;
}

/* ------------------------------ 出院汇聚 ------------------------------ */

/**
 * 出院后自动汇聚首页（幂等）。
 * 从 visits/patients/diagnoses 组装入出院信息、主/其他诊断、费用；
 * 并发对同一出院就诊汇聚只生成一份（唯一约束 + ON CONFLICT 回查）。
 */
export async function aggregateFrontPage(
  auth: AuthView,
  visitId: string,
): Promise<{ page: FrontPage; created: boolean }> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (visit.visitType !== 'inpatient') throw badRequest('仅住院就诊出院后汇聚病案首页');
  if (visit.status !== 'discharged') throw conflict('就诊尚未出院，不能汇聚病案首页');
  if (!canAccess(auth, visit.department)) throw forbidden('不在您的数据范围内');

  const patient = await getPatientById(visit.patientId);
  if (!patient) throw notFound('就诊关联患者不存在');

  const diagnoses = await getDiagnosesByVisit(visitId);
  const primary = diagnoses.find((d: Diagnosis) => d.kind === 'primary' && d.confirmed)
    ?? diagnoses.find((d: Diagnosis) => d.kind === 'primary')
    ?? diagnoses[0];
  const secondary = diagnoses.filter((d: Diagnosis) => d.id !== primary?.id);

  return getDb().begin(async (tx: DbExecutor) => {
    const defects = evaluateFrontPageDefects({
      primaryDiagnosis: primary?.name ?? null,
      primaryDiagnosisCode: primary?.code ?? null,
      operations: [],
      admitAt: visit.admitAt,
      dischargeAt: visit.dischargeAt,
    });
    const { page, created } = await upsertFrontPage(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        department: visit.department,
        admitAt: visit.admitAt,
        dischargeAt: visit.dischargeAt,
        ward: visit.ward,
        bedNo: visit.bedNo,
        primaryDiagnosis: primary?.name ?? null,
        secondaryDiagnoses: secondary.map((d) => ({
          name: d.name, code: d.code, kind: d.kind,
        })),
        operations: [],
        totalFee: visit.totalFee,
        defects,
      },
      tx,
    );
    if (created) {
      await recordChainAudit(
        {
          actorId: auth.id, actorName: auth.realName ?? auth.username,
          actorRole: auth.rawRoles.join(','), actorDept: visit.department,
          action: 'front_page.aggregate', resourceType: 'medical_record_front_page',
          resourceId: page.id, patientRef: visit.patientId, result: 'success',
          riskLevel: 'low', detail: { visitId: visit.id, defects: defects.length },
        },
        tx,
      );
    }
    return { page, created };
  });
}

/* ------------------------------ 队列 / 详情 --------------------------- */

const QUEUE_ALL: FrontPageStatus[] = ['draft', 'coding', 'qc'];

export async function getFrontPageQueue(auth: AuthView) {
  const rows = await listFrontPages(QUEUE_ALL);
  const items = rows.filter((r: FrontPageQueueRow) => canAccess(auth, r.department));
  return { items, total: items.length };
}

export interface FrontPageDetail {
  page: FrontPage;
  visit: { id: string; visitNo: string; department: string; admitAt: string | null; dischargeAt: string | null };
  patient: { mrn: string; nameMasked: string } | null;
  reviews: FrontPageReview[];
}

export async function getFrontPageDetail(auth: AuthView, pageId: string): Promise<FrontPageDetail> {
  const page = await getFrontPageById(pageId);
  if (!page) throw notFound('病案首页不存在');
  if (!canAccess(auth, page.department)) throw forbidden('不在您的数据范围内');
  const visit = await getVisitById(page.visitId);
  const patient = visit ? await getPatientById(visit.patientId) : null;
  const reviews = await listReviewsByFrontPage(pageId);
  return {
    page,
    visit: visit
      ? {
          id: visit.id, visitNo: visit.visitNo, department: visit.department,
          admitAt: visit.admitAt, dischargeAt: visit.dischargeAt,
        }
      : { id: page.visitId, visitNo: '', department: page.department, admitAt: page.admitAt, dischargeAt: page.dischargeAt },
    patient: patient ? { mrn: patient.mrn, nameMasked: patient.nameMasked } : null,
    reviews,
  };
}

/* ------------------------------ 编码保存 ------------------------------ */

export interface SaveCodingBody {
  version: number;
  primaryDiagnosis?: string | null;
  primaryDiagnosisCode?: string | null;
  secondaryDiagnoses?: Array<Record<string, unknown>>;
  operations?: Array<Record<string, unknown>>;
  totalFee?: number | string | null;
}

export async function saveCoding(auth: AuthView, pageId: string, body: SaveCodingBody) {
  if (!Number.isInteger(body.version)) throw badRequest('version 必填（乐观锁）');
  const detail = await getFrontPageDetail(auth, pageId);
  if (detail.page.status === 'archived') throw conflict('已归档的首页不可再编码');

  const primaryDiagnosis = body.primaryDiagnosis ?? detail.page.primaryDiagnosis;
  const operations = body.operations ?? detail.page.operations;
  const defects = evaluateFrontPageDefects({
    primaryDiagnosis,
    primaryDiagnosisCode: body.primaryDiagnosisCode ?? detail.page.primaryDiagnosisCode,
    operations,
    admitAt: detail.page.admitAt,
    dischargeAt: detail.page.dischargeAt,
  });
  const blockCount = defects.filter((d) => d.severity !== 'minor').length;
  const qualityScore = blockCount === 0 ? 100 : Math.max(0, 100 - blockCount * 10);

  return getDb().begin(async (tx: DbExecutor) => {
    const next = await transitionFrontPage(
      pageId, body.version,
      ['draft', 'coding'], 'coding',
      {
        primaryDiagnosis,
        primaryDiagnosisCode: body.primaryDiagnosisCode ?? detail.page.primaryDiagnosisCode,
        secondaryDiagnoses: body.secondaryDiagnoses ?? detail.page.secondaryDiagnoses,
        operations,
        totalFee: body.totalFee ?? detail.page.totalFee,
        defects, qualityScore,
        codedBy: auth.id, codedAt: new Date().toISOString(),
      },
      tx,
    );
    if (!next) throw conflict('版本号已变更或状态非法，请刷新后重试（乐观锁冲突）');
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: detail.page.department,
        action: 'front_page.code', resourceType: 'medical_record_front_page', resourceId: pageId,
        patientRef: detail.page.patientId, result: 'success', riskLevel: 'low',
        detail: { defects: defects.length, qualityScore },
      },
      tx,
    );
    return { page: next, defects, qualityScore };
  });
}

/* ------------------------------ 质控结论 ------------------------------ */

export interface ReviewBody {
  version: number;
  decision: 'pass' | 'return';
  comment?: string | null;
  defects?: FrontPageDefect[];
  acknowledgeIssues?: boolean;
}

function sanitizeDefects(raw: unknown): FrontPageDefect[] {
  if (!Array.isArray(raw)) return [];
  const out: FrontPageDefect[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    if (typeof r.message !== 'string') continue;
    out.push({
      field: typeof r.field === 'string' ? r.field : 'unknown',
      severity: r.severity === 'block' ? 'block' : r.severity === 'minor' ? 'minor' : 'major',
      message: r.message,
    });
  }
  return out;
}

export async function submitReview(auth: AuthView, pageId: string, body: ReviewBody) {
  if (body.decision !== 'pass' && body.decision !== 'return') throw badRequest('decision 必须为 pass 或 return');
  if (!Number.isInteger(body.version)) throw badRequest('version 必填（乐观锁）');
  const detail = await getFrontPageDetail(auth, pageId);
  const page = detail.page;

  if (page.status !== 'coding') throw conflict('仅已编码待质控(coding)状态的首页可质控');
  if (!page.codedBy) throw conflict('首页尚未编码，不能质控');

  // 职责分离：质控人不得为编码员本人
  if (page.codedBy === auth.id) {
    throw forbidden('不能质控本人编码的病案首页，请由第二人质控（职责分离）');
  }

  const defects = sanitizeDefects(body.defects).length > 0
    ? sanitizeDefects(body.defects)
    : page.defects;
  const hardIssues = defects.filter((d) => d.severity !== 'minor');

  if (body.decision === 'pass') {
    if (hardIssues.length > 0 && (!body.acknowledgeIssues || !(body.comment ?? '').trim())) {
      throw conflict('存在阻断/主要缺陷时通过，须显式确认并在质控意见中写明理由');
    }
  } else if (!(body.comment ?? '').trim()) {
    throw badRequest('退回质控必须填写退回原因');
  }

  const toStatus: FrontPageStatus = body.decision === 'pass' ? 'qc' : 'coding';

  return getDb().begin(async (tx: DbExecutor) => {
    const next = await transitionFrontPage(
      pageId, body.version,
      ['coding'], toStatus,
      { defects, qualityScore: hardIssues.length === 0 ? 100 : (page.qualityScore ?? 0) },
      tx,
    );
    if (!next) throw conflict('版本号已变更或状态非法，请刷新后重试（乐观锁冲突）');
    const review = await insertFrontPageReview(
      {
        frontPageId: pageId, reviewerId: auth.id, decision: body.decision,
        defects, comment: body.comment ?? null,
      },
      tx,
    );
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: page.department,
        action: body.decision === 'pass' ? 'front_page.qc_pass' : 'front_page.qc_return',
        resourceType: 'medical_record_front_page', resourceId: pageId,
        patientRef: page.patientId, result: 'success', riskLevel: 'medium',
        detail: { newStatus: toStatus, defects: defects.length, reviewId: review.id },
      },
      tx,
    );
    return { page: next, review };
  });
}

/* -------------------------------- 归档 -------------------------------- */

export async function archiveFrontPage(auth: AuthView, pageId: string, version: number) {
  if (!Number.isInteger(version)) throw badRequest('version 必填（乐观锁）');
  const detail = await getFrontPageDetail(auth, pageId);
  const page = detail.page;
  if (page.status !== 'qc') throw conflict('仅质控通过(qc)状态的首页可归档');

  return getDb().begin(async (tx: DbExecutor) => {
    const next = await transitionFrontPage(
      pageId, version,
      ['qc'], 'archived',
      { archivedBy: auth.id, archivedAt: new Date().toISOString() },
      tx,
    );
    if (!next) throw conflict('版本号已变更或状态非法，请刷新后重试（乐观锁冲突）');
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: page.department,
        action: 'front_page.archive', resourceType: 'medical_record_front_page', resourceId: pageId,
        patientRef: page.patientId, result: 'success', riskLevel: 'medium',
        detail: { archivedAt: next.archivedAt },
      },
      tx,
    );
    return { page: next };
  });
}
