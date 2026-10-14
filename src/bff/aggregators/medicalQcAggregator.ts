import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalQcRepo';

export class MedicalQcError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('medical_qc:view')) throw new MedicalQcError(403, '无查看权限');
  if (!visitId) throw new MedicalQcError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('medical_qc:check')) throw new MedicalQcError(403, '无质控权限');
  if (!body.visitId) throw new MedicalQcError(400, 'visitId 必填');
  if (typeof body.score !== 'number') throw new MedicalQcError(400, '分数必填');
  return repo.create({
    visitId: String(body.visitId), qcType: String(body.qcType ?? 'round'),
    checker: view.id, score: body.score,
    errors: (body.errors as repo.QcError[]) ?? [],
    suggestions: body.suggestions ? String(body.suggestions) : undefined,
  });
}

export async function rectifyView(view: AuthView, id: string) {
  const r = await repo.rectify(id);
  if (!r) throw new MedicalQcError(409, '仅待整改质控单可整改');
  return r;
}

/* --------------------------------------------------------------------------
 * 三级运行病历质控（M2-B）聚合接口。
 *
 * 说明：本模块当前仅落库了 list/create/rectify 基础质控单；下列 runQcCheck /
 * getQcRecord / submitQcReview / resubmitRecord / getQcQueue 为集成测试
 * （tests/integration/medical-record-qc.test.ts）按 M2-B 契约引用的接口形状。
 * 此处先提供与测试调用一致的类型签名，运行时显式抛“未实现”，待后续按真实
 * 状态机补全。仅作类型对齐，不改变既有 list/create/rectify 行为。
 * ------------------------------------------------------------------------ */

export interface QcIssue {
  code?: string;
  message?: string;
  level?: string;
}

export interface QcCheckResult {
  canPass: boolean;
  score: number;
  rule: { blockCount: number; majorCount?: number; minorCount?: number };
  issues: QcIssue[];
  ai: { issues: unknown; model: unknown; error: unknown };
}

export interface QcRecordView {
  nextLevel: number;
  status?: string;
}

export interface QcQueueItem {
  recordId: string;
  department: string;
}

export interface QcReviewInput {
  decision: 'pass' | 'return';
  level: number;
  comment?: string;
  acknowledgeIssues?: boolean;
  issues?: QcIssue[];
}

export async function runQcCheck(_view: AuthView, _recordId: string, _useAi?: boolean): Promise<QcCheckResult> {
  throw new MedicalQcError(501, 'runQcCheck 尚未实现');
}

export async function getQcRecord(_view: AuthView, _recordId: string): Promise<QcRecordView> {
  throw new MedicalQcError(501, 'getQcRecord 尚未实现');
}

export async function submitQcReview(
  _view: AuthView, _recordId: string, _body: QcReviewInput,
): Promise<{ newStatus: string }> {
  throw new MedicalQcError(501, 'submitQcReview 尚未实现');
}

export async function resubmitRecord(_view: AuthView, _recordId: string): Promise<{ status: string }> {
  throw new MedicalQcError(501, 'resubmitRecord 尚未实现');
}

export async function getQcQueue(_view: AuthView): Promise<{ items: QcQueueItem[] }> {
  throw new MedicalQcError(501, 'getQcQueue 尚未实现');
}
