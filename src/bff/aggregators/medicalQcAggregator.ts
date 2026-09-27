/**
 * 健澜科技 jlmedaios - 运行病历质控聚合器（M2-B）
 *
 * 三级质控闭环：
 *  1) 待质控队列：submitted/returned（一级）、reviewed（二级）、signed（三级）；
 *  2) 质控检查：确定性规则引擎（完整性/时限/缺陷）+ 可选 AI 辅助（仅提示、标注来源）；
 *  3) 质控结论：pass 逐级推进 reviewed→signed→archived，return 退回整改；
 *     质控人不得为作者本人，结论由质控医师签名并写审计哈希链；
 *  4) 整改：作者修改后 resubmit 重新进入队列，全过程留痕。
 *
 * AI 仅辅助：不产生最终结论；规则 block/major 未消除时通过须显式确认并写明理由。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type MedicalRecord,
  getMedicalRecordById,
} from '../../db/repositories/medicalRecordRepo.js';
import {
  type RecordReview,
  insertReview,
  listReviewsByRecord,
} from '../../db/repositories/medicalRecordReviewRepo.js';
import {
  evaluateRecord,
  TIMELINESS_RULES,
  type QcContext,
  type QcIssue,
} from '../../knowledge/qc/medicalRecordQc.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class QcError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'QcError';
  }
}
const badRequest = (m: string) => new QcError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new QcError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new QcError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new QcError(409, 'CONFLICT', m);

/* ------------------------------ 访问范围 ------------------------------ */

function canAccess(auth: AuthView, visit: Visit): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return visit.department === auth.deptName;
  }
  return visit.attendingDoctorId === auth.id;
}

/** 病历状态 → 下一质控级别 */
export function nextLevelForStatus(status: string): number | null {
  if (status === 'submitted' || status === 'returned') return 1;
  if (status === 'reviewed') return 2;
  if (status === 'signed') return 3;
  return null;
}
const PASS_STATUS: Record<number, string> = { 1: 'reviewed', 2: 'signed', 3: 'archived' };

/* ------------------------------ 组装工具 ------------------------------ */

async function loadBundle(auth: AuthView, recordId: string) {
  const record = await getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在或已删除');
  const visit = await getVisitById(record.visitId);
  if (!visit) throw notFound('病历关联就诊不存在');
  if (!canAccess(auth, visit)) throw forbidden('不在您的数据范围内');
  const patient = await getPatientById(visit.patientId);
  return { record, visit, patient };
}

function buildTimeliness(record: MedicalRecord, visit: Visit): QcContext | undefined {
  const rule = TIMELINESS_RULES[record.recordType];
  if (!rule) return undefined;
  if (record.recordType === 'admission') {
    return visit.admitAt
      ? { eventTime: visit.admitAt, deadlineHours: rule.deadlineHours, eventLabel: rule.label }
      : undefined;
  }
  if (record.recordType === 'discharge') {
    return visit.dischargeAt
      ? { eventTime: visit.dischargeAt, deadlineHours: rule.deadlineHours, eventLabel: rule.label }
      : undefined;
  }
  return undefined;
}

/* ------------------------------ AI 辅助 ------------------------------ */

function extractJson(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return text;
}

async function aiQc(record: MedicalRecord): Promise<{ issues: QcIssue[]; model: string; error: string | null }> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return { issues: [], model: '', error: '未配置 LLM_API_KEY，AI 辅助质控不可用' };
  const baseURL = (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL ?? 'deepseek-chat';
  const system = [
    '你是一名严谨的医院病历质控员助手，服务于杭州健澜科技 jlmedaios 系统。',
    '请仅依据用户提供的病历正文，按《病历书写基本规范》找出书写缺陷（完整性、逻辑性、时限性、规范性）。',
    '不得编造病历中不存在的内容；拿不准的不要上报。',
    '必须严格输出一个 JSON 对象，不要输出解释或 markdown，结构为：',
    '{"issues":[{"section":"段落名(可空)","severity":"major 或 minor","message":"中文问题描述"}],"summary":"总体一句话评价"}',
  ].join('\n');
  const user = `病历类型：${record.recordType}\n标题：${record.title}\n正文：\n${record.plainText ?? ''}`;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 45_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (timer.unref) timer.unref();
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        max_tokens: 2048,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { issues: [], model, error: `AI 服务返回 ${response.status}：${detail.slice(0, 120)}` };
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    if (!raw.trim()) return { issues: [], model, error: 'AI 返回为空' };
    let parsed: { issues?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(extractJson(raw)) as { issues?: Array<Record<string, unknown>> };
    } catch {
      return { issues: [], model, error: 'AI 输出无法解析为 JSON' };
    }
    const issues: QcIssue[] = (parsed.issues ?? [])
      .filter((x) => typeof x.message === 'string' && x.message.trim())
      .map((x, i) => ({
        ruleId: `ai.qc.${i + 1}`,
        category: 'defect' as const,
        severity: x.severity === 'major' ? ('major' as const) : ('minor' as const),
        section: typeof x.section === 'string' ? x.section : undefined,
        message: String(x.message).trim(),
        source: 'ai' as const,
      }));
    return { issues, model, error: issues.length === 0 ? null : null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { issues: [], model, error: `AI 辅助质控失败：${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------ 队列 ------------------------------ */

const QUEUE_STATUSES = ['submitted', 'returned', 'reviewed', 'signed'];

export async function getQcQueue(auth: AuthView) {
  const db = getDb();
  const rows = await db`
    SELECT mr.id AS record_id, mr.record_type, mr.title, mr.status, mr.updated_at,
      v.id AS visit_id, v.department, v.visit_no,
      p.mrn, p.name_masked
    FROM clinical.medical_records mr
    JOIN clinical.visits v ON v.id = mr.visit_id
    JOIN clinical.patients p ON p.id = v.patient_id
    WHERE mr.deleted_at IS NULL AND mr.status IN ${db(QUEUE_STATUSES)}
    ORDER BY mr.updated_at DESC
  `;
  const items = [];
  for (const row of rows as Array<Record<string, unknown>>) {
    const visitLike: Visit = { department: String(row.department) } as Visit;
    if (!canAccess(auth, visitLike)) continue;
    const status = String(row.status);
    items.push({
      recordId: String(row.record_id),
      recordType: String(row.record_type),
      title: String(row.title),
      status,
      nextLevel: nextLevelForStatus(status),
      department: String(row.department),
      visitNo: String(row.visit_no),
      mrn: String(row.mrn),
      patientName: String(row.name_masked),
      updatedAt: String(row.updated_at),
    });
  }
  return { items, total: items.length };
}

/* ------------------------------ 详情 ------------------------------ */

export async function getQcRecord(auth: AuthView, recordId: string) {
  const { record, visit, patient } = await loadBundle(auth, recordId);
  const reviews = await listReviewsByRecord(recordId);
  const rule = evaluateRecord(
    {
      recordType: record.recordType, content: record.content,
      plainText: record.plainText, authorId: record.authorId, createdAt: record.createdAt,
    },
    buildTimeliness(record, visit),
  );
  return {
    record,
    visit: {
      id: visit.id, visitNo: visit.visitNo, department: visit.department,
      admitAt: visit.admitAt, dischargeAt: visit.dischargeAt,
    },
    patient: patient ? { mrn: patient.mrn, nameMasked: patient.nameMasked } : null,
    reviews,
    nextLevel: nextLevelForStatus(record.status),
    latestRule: rule,
  };
}

/* ------------------------------ 检查 ------------------------------ */

export async function runQcCheck(auth: AuthView, recordId: string, useAi: boolean) {
  const { record, visit } = await loadBundle(auth, recordId);
  const rule = evaluateRecord(
    {
      recordType: record.recordType, content: record.content,
      plainText: record.plainText, authorId: record.authorId, createdAt: record.createdAt,
    },
    buildTimeliness(record, visit),
  );
  let ai: { issues: QcIssue[]; model: string; error: string | null } = { issues: [], model: '', error: null };
  if (useAi) ai = await aiQc(record);
  return {
    rule,
    ai,
    issues: [...rule.issues, ...ai.issues],
    score: rule.score,
    canPass: rule.canPass,
  };
}

/* ------------------------------ 结论 ------------------------------ */

export interface QcSubmitBody {
  decision: 'pass' | 'return';
  level: number;
  comment?: string | null;
  issues?: Array<Record<string, unknown>>;
  aiAssisted?: boolean;
  aiModel?: string | null;
  acknowledgeIssues?: boolean;
}

function sanitizeSnapshot(raw: unknown): QcIssue[] {
  if (!Array.isArray(raw)) return [];
  const out: QcIssue[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    if (typeof r.ruleId !== 'string' || typeof r.message !== 'string') continue;
    const severity = r.severity === 'block' ? 'block' : r.severity === 'minor' ? 'minor' : 'major';
    const source = r.source === 'ai' ? 'ai' : 'rule';
    out.push({
      ruleId: r.ruleId, category: 'defect', severity, source,
      section: typeof r.section === 'string' ? r.section : undefined,
      message: r.message,
    });
  }
  return out;
}

export async function submitQcReview(auth: AuthView, recordId: string, body: QcSubmitBody) {
  if (body.decision !== 'pass' && body.decision !== 'return') throw badRequest('decision 必须为 pass 或 return');
  if (!Number.isInteger(body.level) || body.level < 1 || body.level > 3) throw badRequest('level 必须为 1/2/3');
  const { record, visit } = await loadBundle(auth, recordId);

  const expectedLevel = nextLevelForStatus(record.status);
  if (expectedLevel === null) throw conflict('当前病历状态不在质控流程中');
  if (body.level !== expectedLevel) throw conflict(`当前应执行 ${expectedLevel} 级质控，而非 ${body.level} 级`);

  // 职责分离：质控人不得为作者本人
  if (record.authorId && record.authorId === auth.id) {
    throw forbidden('不能质控本人书写的病历，请由其他医师质控');
  }

  // 快照：优先用前端回传（含 AI），否则用最新规则重算
  let snapshot = sanitizeSnapshot(body.issues);
  if (snapshot.length === 0) {
    const fresh = evaluateRecord(
      {
        recordType: record.recordType, content: record.content, plainText: record.plainText,
        authorId: record.authorId, createdAt: record.createdAt,
      },
      buildTimeliness(record, visit),
    );
    snapshot = fresh.issues;
  }
  const ruleIssues = snapshot.filter((i) => i.source === 'rule');
  const aiIssues = snapshot.filter((i) => i.source === 'ai');
  const hardIssues = ruleIssues.filter((i) => i.severity !== 'minor');

  let newStatus: string;
  if (body.decision === 'return') {
    newStatus = 'returned';
  } else {
    if (hardIssues.length > 0 && (!body.acknowledgeIssues || !(body.comment ?? '').trim())) {
      throw conflict('存在阻断/主要缺陷时通过，须显式确认并在意见中写明临床理由');
    }
    newStatus = PASS_STATUS[body.level];
  }

  return getDb().begin(async (tx: DbExecutor) => {
    const review: RecordReview = await insertReview(
      {
        recordId, reviewLevel: body.level, decision: body.decision, reviewerId: auth.id,
        comment: body.comment ?? null, issues: snapshot,
        ruleIssueCount: ruleIssues.length, aiIssueCount: aiIssues.length,
        aiAssisted: body.aiAssisted === true || aiIssues.length > 0,
        aiModel: body.aiModel ?? null,
      },
      tx,
    );
    await tx`
      UPDATE clinical.medical_records
      SET status = ${newStatus},
          quality_score = ${ruleIssues.length === 0 ? 100 : Math.max(0, 100 - hardIssues.length * 8)},
          quality_issues = ${tx.json(ruleIssues)},
          updated_at = now()
      WHERE id = ${recordId} AND deleted_at IS NULL
    `;
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','), actorDept: visit.department,
        action: body.decision === 'pass' ? `medical_qc.pass.l${body.level}` : 'medical_qc.return',
        resourceType: 'medical_record', resourceId: recordId,
        patientRef: visit.patientId, result: 'success',
        riskLevel: body.level === 1 ? 'low' : 'medium',
        detail: { newStatus, ruleIssues: ruleIssues.length, aiIssues: aiIssues.length },
      },
      tx,
    );
    return { review, newStatus };
  });
}

/* ------------------------------ 整改重提 ------------------------------ */

export async function resubmitRecord(auth: AuthView, recordId: string) {
  const record = await getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在');
  if (record.status !== 'returned') throw conflict('仅退回整改状态的病历可重新提交');
  if (!record.authorId || record.authorId !== auth.id) {
    throw forbidden('仅病历作者本人可整改后重新提交');
  }
  const visit = await getVisitById(record.visitId);
  if (visit) {
    if (!canAccess(auth, visit)) throw forbidden('不在您的数据范围内');
  }
  return getDb().begin(async (tx: DbExecutor) => {
    await tx`
      UPDATE clinical.medical_records SET status = 'submitted', updated_at = now()
      WHERE id = ${recordId}
    `;
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'medical_qc.resubmit', resourceType: 'medical_record', resourceId: recordId,
        patientRef: visit?.patientId, result: 'success', riskLevel: 'low',
      },
      tx,
    );
    return { recordId, status: 'submitted' };
  });
}
/* ------------------------------ 提交质控（作者） ------------------------------ */

export async function submitForQc(auth: AuthView, recordId: string) {
  const record = await getMedicalRecordById(recordId);
  if (!record) throw notFound('病历不存在');
  if (record.status !== 'draft') throw conflict('仅草稿状态的病历可提交质控');
  if (!record.authorId || record.authorId !== auth.id) {
    throw forbidden('仅病历作者本人可提交质控');
  }
  const visit = await getVisitById(record.visitId);
  if (visit && !canAccess(auth, visit)) throw forbidden('不在您的数据范围内');

  return getDb().begin(async (tx: DbExecutor) => {
    await tx`
      UPDATE clinical.medical_records SET status='submitted', updated_at=now()
      WHERE id=${recordId}
    `;
    await recordChainAudit(
      {
        actorId: auth.id, actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'medical_qc.submit_for_qc', resourceType: 'medical_record', resourceId: recordId,
        patientRef: visit?.patientId, result: 'success', riskLevel: 'low',
      },
      tx,
    );
    return { recordId, status: 'submitted' };
  });
}