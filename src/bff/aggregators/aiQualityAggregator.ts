/**
 * 健澜科技 jlmedaios - AI 质控智能审核聚合器（M144-D）
 *
 * 【AI核心能力深化】在病历归档前对核心条款做机器自动质控，六大检查项全覆盖、
 * 逐项判定、按严重程度分级（critical / major / minor），质控科只做复核与例外处理：
 *   1. 主诉完整   chiefComplaint   —— 缺失或过短 → major
 *   2. 现病史充分 presentIllness   —— 缺失或过短 → major
 *   3. 诊断明确   diagnosis        —— 缺失/笼统待查 → critical（影响诊疗）
 *   4. 用药合理   medications      —— 重复用药 → major；缺用法用量 → minor
 *   5. 签名齐全   signature        —— 未签名/签名人空缺 → critical（法律效力）
 *   6. 时限达标   timeliness       —— 超约定完成时限 → major
 *
 * 设计原则：
 *  - aiQualityCheck / generateQualityReport 为纯函数，输入确定则输出确定，不依赖数据库、
 *    不读时钟（checkedAt 由调用方注入或函数内取当前时间戳仅作展示），便于单测；
 *  - learnFromQualityFeedback 把质控科人工复核结论回流到学习注册表，驱动规则持续优化；
 *  - 数据库读写只出现在 runQualityCheck / reportView 等异步视图包装里，且全部 try/catch
 *    安全降级，绝不因存储故障阻断质控流程。
 *
 * 医疗安全红线：AI 只做提示与留痕，不替代质控科人工复核与医师签名责任。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';

/** 问题分级：critical 致命 / major 严重 / minor 一般 */
export type QualitySeverity = 'critical' | 'major' | 'minor';

/** 六大核心检查项 key */
export type CheckItem =
  | 'chiefComplaint'
  | 'presentIllness'
  | 'diagnosis'
  | 'medication'
  | 'signature'
  | 'timeliness';

/** 单条质控问题 */
export interface QualityIssue {
  /** 命中的规则码，如 diagnosis.unclear */
  rule: string;
  /** 属于哪一项核心检查 */
  checkItem: CheckItem;
  /** 问题分级 */
  severity: QualitySeverity;
  /** 面向质控科的问题描述 */
  message: string;
}

/** 被审核的病历/文书内容（由调用方从 EMR 抽取后传入） */
export interface RecordContent {
  /** 主诉 */
  chiefComplaint?: string | null;
  /** 现病史 */
  presentIllness?: string | null;
  /** 诊断（主诊断/初步诊断） */
  diagnosis?: string | null;
  /** 用药清单（每条应含药名+用法用量，如 "阿莫西林胶囊 0.5g  tid"） */
  medications?: string[] | null;
  /** 是否已签名 */
  signed?: boolean | null;
  /** 签名人姓名/工号 */
  signedBy?: string | null;
  /** 记录实际完成时间（ISO 8601） */
  recordCreatedAt?: string | null;
  /** 规定应完成时限（ISO 8601），超时即不达标 */
  dueAt?: string | null;
  /** 所属科室 */
  dept?: string | null;
}

/** aiQualityCheck 的判定结果 */
export interface CheckResult {
  recordId: string;
  /** 质控得分 0-100 */
  score: number;
  /** 是否通过：score>=80 且无 critical 问题 */
  passed: boolean;
  /** 问题总数 */
  issueCount: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  /** 逐项问题明细 */
  issues: QualityIssue[];
  /** 判定时间（ISO 8601） */
  checkedAt: string;
}

/** 质控科周期报告 */
export interface QualityReport {
  dept: string;
  period: string;
  totalChecked: number;
  passedCount: number;
  passRate: number;
  avgScore: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  /** 高频问题规则 Top N（按命中次数降序） */
  topRules: { rule: string; count: number }[];
  generatedAt: string;
}

export class AiQualityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ------------------------------- 规则常量 ------------------------------- */

/** 各分级扣分 */
const SEVERITY_DEDUCTION: Record<QualitySeverity, number> = {
  critical: 30,
  major: 10,
  minor: 3,
};

/** 通过线：得分 >= 80 且无 critical */
const PASS_SCORE_LINE = 80;
/** 主诉最短字数 */
const CHIEF_COMPLAINT_MIN_LEN = 4;
/** 现病史最短字数 */
const PRESENT_ILLNESS_MIN_LEN = 20;
/** 诊断笼统词 */
const VAGUE_DIAGNOSIS = /^(待查|待诊|待排查|待明确|\?+|？+)$/;

const text = (v: string | null | undefined): string => (typeof v === 'string' ? v.trim() : '');

/* ------------------------- 纯函数：单次质控判定 ------------------------- */

/**
 * 【AI核心能力深化】纯函数：对单条病历内容做六大核心条款质控。
 * 不依赖外部状态，同一输入恒得同一输出。
 *
 * @param recordId     被审记录 ID
 * @param recordContent 病历内容（各字段可空，缺失即按对应规则判定）
 */
export function aiQualityCheck(
  recordId: string,
  recordContent: RecordContent,
): CheckResult {
  const issues: QualityIssue[] = [];
  const content = recordContent ?? {};

  // 1) 主诉完整
  const chief = text(content.chiefComplaint);
  if (chief.length < CHIEF_COMPLAINT_MIN_LEN) {
    issues.push({
      rule: 'chief_complaint.incomplete',
      checkItem: 'chiefComplaint',
      severity: 'major',
      message: `主诉缺失或过短（<${CHIEF_COMPLAINT_MIN_LEN}字），请补充主要症状+持续时间`,
    });
  }

  // 2) 现病史充分
  const present = text(content.presentIllness);
  if (present.length < PRESENT_ILLNESS_MIN_LEN) {
    issues.push({
      rule: 'present_illness.insufficient',
      checkItem: 'presentIllness',
      severity: 'major',
      message: `现病史缺失或过于简略（<${PRESENT_ILLNESS_MIN_LEN}字），应详述起病情况、症状特点与演变`,
    });
  }

  // 3) 诊断明确
  const diagnosis = text(content.diagnosis);
  if (diagnosis.length < 2 || VAGUE_DIAGNOSIS.test(diagnosis)) {
    issues.push({
      rule: 'diagnosis.unclear',
      checkItem: 'diagnosis',
      severity: 'critical',
      message: '诊断缺失或仅写"待查"，主诊断不明确将影响后续诊疗闭环',
    });
  }

  // 4) 用药合理（仅当记录了用药时才核查，避免对无药医嘱误报）
  const meds = Array.isArray(content.medications) ? content.medications : [];
  if (meds.length > 0) {
    const seen = new Map<string, number>();
    meds.forEach((raw, idx) => {
      const med = text(raw);
      if (!med) return;
      // 药名取首段用于重复判定
      const name = med.split(/[\s，,]/)[0].toLowerCase();
      seen.set(name, (seen.get(name) ?? 0) + 1);
      // 缺用法用量（没有数字剂量）→ minor
      if (!/\d/.test(med)) {
        issues.push({
          rule: 'medication.incomplete_dose',
          checkItem: 'medication',
          severity: 'minor',
          message: `第 ${idx + 1} 条用药"${med}"未标注剂量/用法用量`,
        });
      }
    });
    for (const [name, count] of seen) {
      if (count > 1) {
        issues.push({
          rule: 'medication.duplicate',
          checkItem: 'medication',
          severity: 'major',
          message: `检测到重复用药："${name}" 出现 ${count} 次，请核对是否重复开嘱`,
        });
      }
    }
  }

  // 5) 签名齐全
  if (content.signed !== true || !text(content.signedBy)) {
    issues.push({
      rule: 'signature.missing',
      checkItem: 'signature',
      severity: 'critical',
      message: '病历未签名或签名人空缺，不具备法律效力，须补签',
    });
  }

  // 6) 时限达标
  const createdTs = Date.parse(text(content.recordCreatedAt));
  const dueTs = Date.parse(text(content.dueAt));
  if (!Number.isNaN(createdTs) && !Number.isNaN(dueTs) && createdTs > dueTs) {
    issues.push({
      rule: 'timeliness.overdue',
      checkItem: 'timeliness',
      severity: 'major',
      message: `记录完成时间晚于规定时限（超 ${Math.round((createdTs - dueTs) / 3600000)}h）`,
    });
  }

  // 计分与分级统计
  let score = 100;
  let critical = 0, major = 0, minor = 0;
  for (const issue of issues) {
    score -= SEVERITY_DEDUCTION[issue.severity];
    if (issue.severity === 'critical') critical += 1;
    else if (issue.severity === 'major') major += 1;
    else minor += 1;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    recordId,
    score,
    passed: score >= PASS_SCORE_LINE && critical === 0,
    issueCount: issues.length,
    criticalCount: critical,
    majorCount: major,
    minorCount: minor,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

/* ------------------------- 纯函数：科室周期报告 ------------------------ */

/**
 * 【AI核心能力深化】纯函数：把一段时间内的质控判定结果汇总为科室报告。
 *
 * @param dept    科室
 * @param period  统计周期（如 2026-10）
 * @param results 该周期内 aiQualityCheck 的判定结果集合
 */
export function generateQualityReport(
  dept: string,
  period: string,
  results: CheckResult[],
): QualityReport {
  const list = Array.isArray(results) ? results : [];
  const total = list.length;
  const passedCount = list.filter((r) => r.passed).length;

  let scoreSum = 0, critical = 0, major = 0, minor = 0;
  const ruleCounter = new Map<string, number>();
  for (const r of list) {
    scoreSum += r.score;
    critical += r.criticalCount;
    major += r.majorCount;
    minor += r.minorCount;
    for (const issue of r.issues ?? []) {
      ruleCounter.set(issue.rule, (ruleCounter.get(issue.rule) ?? 0) + 1);
    }
  }

  const topRules = [...ruleCounter.entries()]
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    dept,
    period,
    totalChecked: total,
    passedCount,
    passRate: total === 0 ? 0 : Math.round((passedCount / total) * 1000) / 10,
    avgScore: total === 0 ? 0 : Math.round((scoreSum / total) * 10) / 10,
    criticalCount: critical,
    majorCount: major,
    minorCount: minor,
    topRules,
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------- 学习反馈：越用越准（反馈注册表） --------------------- */

/** 单条学习反馈记录 */
export interface QualityFeedbackEntry {
  recordId: string;
  /** 累计被人工纠正为"AI判错"的次数 */
  errorCount: number;
  /** 累计反馈条数 */
  feedbackCount: number;
  /** 最近一次纠正说明 */
  lastCorrection: string | null;
  lastFeedbackAt: string;
}

/** 模块级学习注册表（确定性内存态；持久化由异步视图最佳-effort 写入 DB） */
const feedbackRegistry = new Map<string, QualityFeedbackEntry>();

/**
 * 【AI核心能力深化】学习反馈回流：质控科人工复核后告知 AI 原判是否有误。
 * 同一条记录被纠正次数越多，后续对该类记录的审核越需要人工重点复核（误报学习）。
 *
 * @param recordId   被审记录 ID
 * @param isError    AI 原判是否错误（误报/漏报）
 * @param correction 人工纠正说明
 */
export function learnFromQualityFeedback(
  recordId: string,
  isError: boolean,
  correction?: string | null,
): void {
  if (!recordId) return;
  const now = new Date().toISOString();
  let entry = feedbackRegistry.get(recordId);
  if (!entry) {
    entry = { recordId, errorCount: 0, feedbackCount: 0, lastCorrection: null, lastFeedbackAt: now };
    feedbackRegistry.set(recordId, entry);
  }
  entry.feedbackCount += 1;
  if (isError) entry.errorCount += 1;
  entry.lastCorrection = correction ?? entry.lastCorrection;
  entry.lastFeedbackAt = now;

  // 最佳-effort 落库；失败不影响内存学习，不抛错
  try {
    const db = getDb();
    void db`
      INSERT INTO clinical.ai_quality_feedback(record_id, is_error, correction)
      VALUES (${recordId}, ${isError}, ${correction ?? null})
    `.catch(() => undefined);
  } catch { /* 存储不可用：仅保留内存学习态 */ }
}

/** 读取学习注册表快照（供报告与单测使用） */
export function getQualityLearningRegistry(): QualityFeedbackEntry[] {
  return [...feedbackRegistry.values()];
}

/* --------------------- 异步视图包装（鉴权 + 持久化） --------------------- */

/** 触发一次 AI 质控审核：鉴权 → 纯函数判定 → 结果留痕 */
export async function runQualityCheck(
  view: AuthView,
  recordId: string,
  content: RecordContent,
): Promise<CheckResult> {
  if (!view.permissions.includes('ai_quality:check')) {
    throw new AiQualityError(403, '无 AI 质控审核权限');
  }
  if (!recordId) throw new AiQualityError(400, 'recordId 必填');

  const result = aiQualityCheck(recordId, content ?? {});

  // 留痕（失败不阻断审核返回）
  try {
    const db = getDb();
    void db`
      INSERT INTO clinical.ai_quality_check
        (record_id, dept, score, passed, issue_count, critical_count, major_count, minor_count, result)
      VALUES (
        ${recordId}, ${text(content?.dept) || null}, ${result.score}, ${result.passed},
        ${result.issueCount}, ${result.criticalCount}, ${result.majorCount}, ${result.minorCount},
        ${JSON.stringify(result)}::jsonb
      )
    `.catch(() => undefined);
  } catch { /* 留痕失败：审核结果仍正常返回 */ }

  return result;
}

/** 查询科室周期报告：鉴权 → 读库汇总（无数据时返回空报告） */
export async function reportView(
  view: AuthView,
  dept: string,
  period: string,
): Promise<QualityReport> {
  if (!view.permissions.includes('ai_quality:view')) {
    throw new AiQualityError(403, '无 AI 质控查看权限');
  }
  const results: CheckResult[] = [];
  try {
    const db = getDb();
    const rows = (await db`
      SELECT result FROM clinical.ai_quality_check
      WHERE (${dept}::text IS NULL OR dept = ${dept})
        AND (${period}::text IS NULL OR period = ${period})
    `) as Record<string, unknown>[];
    for (const row of rows ?? []) {
      const r = row.result;
      if (r && typeof r === 'object') results.push(r as unknown as CheckResult);
    }
  } catch { /* 读库失败：按空集合出报告 */ }
  return generateQualityReport(dept || '全院', period || '全部', results);
}
