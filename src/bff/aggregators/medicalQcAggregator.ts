import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/medicalQcRepo';
import { withTx } from '@/db/pool.js';
import * as recordRepo from '@/db/repositories/medicalRecordRepo.js';
import * as reviewRepo from '@/db/repositories/medicalRecordReviewRepo.js';
import { callRealLLM } from './llmClientAggregator.js';

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
 * 三级质控状态机：
 *   submitted ──L1 pass──▶ reviewed ──L2 pass──▶ signed ──L3 pass──▶ archived
 *   submitted/reviewed/signed ──任何一级 return──▶ returned ──作者重提──▶ submitted
 *
 * 规则引擎为确定性纯函数（要素完整性校验），AI 仅作辅助叠加；无可用 LLM 时
 * 明确降级标注，规则结果不受 AI 影响。状态推进与 review 留痕在同一事务内提交。
 * 本链路与既有 list/create/rectify 基础质控单相互独立，不改动其行为。
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
  recordType: string;
  title: string;
  status: string;
  nextLevel: number | null;
  department: string;
  visitNo: string;
  mrn: string;
  patientName: string;
  updatedAt: string;
}

export interface QcReviewInput {
  decision: 'pass' | 'return';
  level: number;
  comment?: string;
  acknowledgeIssues?: boolean;
  issues?: QcIssue[];
}

const badRequest = (m: string) => new MedicalQcError(400, m);
const notFound = (m: string) => new MedicalQcError(404, m);
const forbidden = (m: string) => new MedicalQcError(403, m);
const conflict = (m: string) => new MedicalQcError(409, m);

/** 病历结构化要素（完整性规则清单，要素缺失记为阻断缺陷）。 */
const RULE_FIELDS = [
  { key: 'chiefComplaint', label: '主诉' },
  { key: 'presentIllness', label: '现病史' },
  { key: 'pastHistory', label: '既往史' },
  { key: 'physicalExam', label: '体格检查' },
  { key: 'auxiliaryExam', label: '辅助检查' },
  { key: 'diagnosis', label: '诊断' },
  { key: 'treatment', label: '诊疗处理' },
] as const;

/** 各状态当前待审级别：submitted/returned 回到 1 级，reviewed 待 2 级，signed 待 3 级。 */
const NEXT_LEVEL: Record<string, number> = { submitted: 1, returned: 1, reviewed: 2, signed: 3 };

/** 通过后状态推进映射。 */
const PASS_NEXT: Record<string, recordRepo.MedicalRecordStatus> = {
  submitted: 'reviewed',
  reviewed: 'signed',
  signed: 'archived',
};

function isBlank(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

/** 确定性规则判定：要素缺失即阻断缺陷，返回缺陷清单 / 阻断数 / 得分 / 是否可通过。 */
function evaluateRule(content: Record<string, unknown>): {
  issues: QcIssue[];
  blockCount: number;
  majorCount: number;
  minorCount: number;
  score: number;
  canPass: boolean;
} {
  const issues: QcIssue[] = [];
  for (const field of RULE_FIELDS) {
    if (isBlank(content[field.key])) {
      issues.push({ code: `missing_${field.key}`, message: `${field.label}未填写`, level: 'block' });
    }
  }
  const blockCount = issues.length;
  const score = Math.max(0, 100 - blockCount * 20);
  return { issues, blockCount, majorCount: 0, minorCount: 0, score, canPass: blockCount === 0 };
}

/** 从模型输出中防御性提取 AI 缺陷建议数组；非 JSON / 解析失败返回空数组。 */
function parseAiIssues(content: string): QcIssue[] {
  let text = content.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): QcIssue[] => {
    if (item == null || typeof item !== 'object') return [];
    const it = item as Record<string, unknown>;
    const message = typeof it.message === 'string' ? it.message : typeof it.suggestion === 'string' ? String(it.suggestion) : '';
    if (!message.trim()) return [];
    const severity = typeof it.severity === 'string' ? it.severity : 'minor';
    return [{
      code: typeof it.ruleId === 'string' ? it.ruleId : 'ai_suggestion',
      message: message.trim(),
      level: severity === 'block' || severity === 'major' || severity === 'minor' ? severity : 'minor',
    }];
  });
}

/** 构造 AI 质控提示：要素齐备情况 + 正文摘要，要求结构化 JSON 数组输出。 */
function buildAiPrompt(record: recordRepo.MedicalRecord): string {
  const sections = RULE_FIELDS.map((f) => {
    const v = record.content[f.key];
    const filled = isBlank(v) ? '缺失' : '已填写';
    const excerpt = typeof v === 'string' ? v.slice(0, 120) : '';
    return `- ${f.label}（${f.key}）：${filled}${excerpt ? `：${excerpt}` : ''}`;
  }).join('\n');
  return [
    '你是运行病历质控的 AI 辅助审查员。请依据下列病历要素摘要，仅从文书规范性、表述完整性、诊疗逻辑一致性角度给出补充建议；不做诊断、不开具医嘱。',
    '',
    '【病历要素】',
    sections,
    '',
    '【输出要求】仅输出一个 JSON 数组，每项形如 {"message":"具体建议","severity":"minor|major","ruleId":"ai_xxx"}；无建议时输出 []。不要输出 JSON 以外的解释。',
  ].join('\n');
}

/**
 * AI 辅助叠加：调用统一 LLM 入口（带超时/重试/fail-open 降级）。
 * 未配置上游、模型降级或解析失败时，按契约返回空 issues 与降级标注；规则判定与
 * canPass/score 完全不受 AI 结果影响。
 */
async function aiOverlay(record: recordRepo.MedicalRecord, useAi: boolean): Promise<QcCheckResult['ai']> {
  if (!useAi) return { issues: [], model: null, error: null };
  let resp;
  try {
    resp = await callRealLLM(
      buildAiPrompt(record),
      { staffRole: 'medical-qc' },
      { temperature: 0.2, maxRetries: 1, backoffBaseMs: 0 },
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { issues: [], model: null, error: `AI 调用异常：${reason.slice(0, 120)}` };
  }
  if (resp.degraded) {
    return { issues: [], model: resp.model, error: '模型服务暂不可用，本次 AI 辅助降级，仅执行规则检查' };
  }
  return { issues: parseAiIssues(resp.content), model: resp.model, error: null };
}

/** 规则检查（只读，不落库）：返回规则判定 + AI 辅助叠加结构。 */
export async function runQcCheck(_view: AuthView, recordId: string, useAi?: boolean): Promise<QcCheckResult> {
  const record = await recordRepo.getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在');
  const rule = evaluateRule(record.content);
  return {
    canPass: rule.canPass,
    score: rule.score,
    rule: { blockCount: rule.blockCount, majorCount: rule.majorCount, minorCount: rule.minorCount },
    issues: rule.issues,
    ai: await aiOverlay(record, Boolean(useAi)),
  };
}

/** 病历质控视图：当前状态与下一待审级别。 */
export async function getQcRecord(_view: AuthView, recordId: string): Promise<QcRecordView> {
  const record = await recordRepo.getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在');
  return { nextLevel: NEXT_LEVEL[record.status] ?? 0, status: record.status };
}

/**
 * 提交一条质控结论（通过 / 退回）。
 * 校验顺序：质控权限 → 入参合法性 → 病历存在 → 职责分离 → 级别匹配 → 缺陷门禁；
 * review 留痕与病历状态推进在同一事务内提交。
 */
export async function submitQcReview(
  view: AuthView, recordId: string, body: QcReviewInput,
): Promise<{ newStatus: string }> {
  if (!view.permissions.includes('medical_record:audit')) {
    throw forbidden('缺少病历质控权限 medical_record:audit');
  }

  const decision = body.decision;
  if (decision !== 'pass' && decision !== 'return') {
    throw badRequest('decision 必须为 pass / return');
  }
  const level = Number(body.level);
  if (!Number.isInteger(level) || level < 1 || level > 3) {
    throw badRequest('level 必须为 1 / 2 / 3');
  }

  const record = await recordRepo.getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在');

  // 职责分离：质控人不得为病历作者本人。
  if (record.authorId && view.id === record.authorId) {
    throw forbidden('质控人不得为病历作者本人');
  }

  const expectedLevel = NEXT_LEVEL[record.status];
  if (expectedLevel === undefined) throw conflict('当前病历状态不可提交质控结论');
  if (level !== expectedLevel) {
    throw conflict(`越级质控：当前为 ${record.status} 状态，应提交第 ${expectedLevel} 级结论`);
  }

  const rule = evaluateRule(record.content);

  // 缺陷门禁：带阻断缺陷直接通过，须显式确认并写明理由与缺陷清单。
  if (decision === 'pass' && rule.blockCount > 0) {
    const acknowledged = body.acknowledgeIssues === true;
    const issuesProvided = Array.isArray(body.issues) && body.issues.length > 0;
    const commentProvided = typeof body.comment === 'string' && body.comment.trim() !== '';
    if (!acknowledged || !issuesProvided || !commentProvided) {
      throw conflict('存在阻断缺陷，通过须显式确认（acknowledgeIssues）并写明理由与缺陷清单');
    }
  }

  const newStatus: recordRepo.MedicalRecordStatus =
    decision === 'return' ? 'returned' : PASS_NEXT[record.status];
  if (!newStatus) throw conflict('当前病历状态不可推进');

  const reviewIssues = (
    decision === 'pass' && rule.blockCount > 0 ? body.issues ?? rule.issues : rule.issues
  ) as Record<string, unknown>[];

  await withTx(async (tx) => {
    await reviewRepo.insertReview({
      recordId: record.id,
      reviewLevel: expectedLevel,
      decision,
      reviewerId: view.id,
      comment: body.comment ? body.comment.trim() : null,
      issues: reviewIssues.map((i) => ({ ...i })),
      ruleIssueCount: rule.blockCount,
      aiIssueCount: 0,
      aiAssisted: false,
      aiModel: null,
    }, tx);
    await recordRepo.updateMedicalRecordStatus(record.id, newStatus, view.id, tx);
  });

  return { newStatus };
}

/** 作者本人对退回病历重新提交：returned → submitted，非作者 403。 */
export async function resubmitRecord(view: AuthView, recordId: string): Promise<{ status: string }> {
  const record = await recordRepo.getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在');
  if (!record.authorId || view.id !== record.authorId) {
    throw forbidden('仅病历作者本人可重新提交');
  }
  if (record.status !== 'returned') throw conflict('仅退回（returned）状态的病历可重新提交');
  await recordRepo.updateMedicalRecordStatus(record.id, 'submitted', record.authorId);
  return { status: 'submitted' };
}

/** 待质控队列：全院范围（dataScope=all 或 admin 角色）全量；其余仅见本科室病历。 */
export async function getQcQueue(view: AuthView): Promise<{ items: QcQueueItem[] }> {
  const scopeAll = view.dataScope === 'all' || view.rawRoles.includes('admin');
  const rows = await recordRepo.listPendingQcQueue({ deptName: scopeAll ? null : view.deptName });
  return {
    items: rows.map((r) => ({
      recordId: r.recordId,
      recordType: r.recordType,
      title: r.title,
      status: r.status,
      nextLevel: NEXT_LEVEL[r.status] ?? null,
      department: r.department,
      visitNo: r.visitNo,
      mrn: r.mrn,
      patientName: r.patientName,
      updatedAt: r.updatedAt,
    })),
  };
}
