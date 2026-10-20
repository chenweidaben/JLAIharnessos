import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalQcRepo';

export class MedicalQcError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ============================================================================
// v5.0试点扩展（M183-D aggregator stub）：DEMO_MODE 演示兜底
// ----------------------------------------------------------------------------
// 演示模式（DEMO_MODE=1/true）下无 PostgreSQL，medicalQcRepo 会触发表不存在 /
// 连接错误并被路由转为 500。这里在聚合器入口短路：列表返回空数组，创建 / 整改
// 返回字段完整的内存占位记录（不触库、不写审计、不持久化），保证质控管理页在
// 无库演示时不红屏。与 agentBuilder / agentRuntime 的 DEMO 兜底同策略。
// 版权所有（c）2026 杭州健澜科技有限公司
// ============================================================================

/** 是否演示模式（DEMO_MODE=1 / true） */
const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 构造一条演示质控记录（形状与 repo.MedicalQc 对齐，checker 固定 demo-admin） */
function demoRecord(visitId: string, status: repo.MedicalQc['status']): repo.MedicalQc {
  return {
    id: `demo-qc-${Date.now()}`,
    visitId,
    qcType: 'round',
    checker: 'demo-admin',
    checkDate: new Date().toISOString(),
    score: 95,
    errors: [],
    suggestions: '（演示）DEMO_MODE 占位记录，未连接数据库',
    status,
  };
}

export async function listView(view: AuthView, visitId: string) {
  // v5.0试点扩展（M183-D aggregator stub）：DEMO_MODE 下返回空列表，不触库
  if (isDemoMode) return [] as repo.MedicalQc[];
  if (!view.permissions.includes('medical_qc:view')) throw new MedicalQcError(403, '无查看权限');
  if (!visitId) throw new MedicalQcError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  // v5.0试点扩展（M183-D aggregator stub）：DEMO_MODE 下返回占位记录，不写库
  if (isDemoMode) return demoRecord(String(body.visitId ?? 'demo-visit'), 'pending');
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
  // v5.0试点扩展（M183-D aggregator stub）：DEMO_MODE 下返回占位整改记录，不写库
  if (isDemoMode) return demoRecord('demo-visit', 'rectified');
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
