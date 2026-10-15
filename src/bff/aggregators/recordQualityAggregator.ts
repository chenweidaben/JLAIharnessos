/**
 * 健澜科技 jlmedaios - M130-A 病历质控智能审核聚合（核心业务深化）
 *
 * 【核心业务深化】
 *   本模块对一份病历的"诊疗思维链"做结构化自动审核，核心是两个纯函数：
 *     - auditMedicalRecord(recordContent): AuditResult
 *         逐项跑五条质控规则，产出每项通过与否、问题清单与"建议"结论；
 *     - scoreMedicalRecord(checkResults): Score
 *         按各项权重求和得 0-100 分，并给出建议等级（合格/需整改/不合格）。
 *
 * 五项检查项：
 *   1. 主诉完整性 chief_complaint            主诉非空且含持续时间（症状+时长）
 *   2. 现病史时间线 present_illness_timeline 现病史含 ≥2 个时间标记（起病+演变）
 *   3. 鉴别诊断   differential_diagnosis     列出 ≥2 个待鉴别诊断
 *   4. 诊疗计划   treatment_plan             非空且含诊疗动作关键词
 *   5. 用药指征   medication_indication      每条用药均须写明用药指征
 *
 * 医疗安全红线：
 *   - 审核结论一律是"建议"（suggestion），系统不自动判退、不自动归档；
 *   - 所有问题项均需质控医师人工确认后闭环（见 record_quality_check.status）；
 *   - 纯函数不碰数据库、不碰时间、不碰随机数，便于单测穷举边界。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '@/db/pool.js';

/** 质控规则键 */
export type CheckKey =
  | 'chief_complaint'
  | 'present_illness_timeline'
  | 'differential_diagnosis'
  | 'treatment_plan'
  | 'medication_indication';

/** 严重级别：error 必改 / warning 建议补强 */
export type Severity = 'error' | 'warning';

/** 被审核的病历结构化内容 */
export interface MedicalRecordContent {
  /** 主诉 */
  chiefComplaint: string;
  /** 现病史 */
  presentIllness: string;
  /** 鉴别诊断（逗号/顿号分隔多个诊断） */
  differentialDiagnosis: string;
  /** 诊疗计划 */
  treatmentPlan: string;
  /** 用药列表：药名 + 用药指征 */
  medications: Array<{ name: string; indication?: string }>;
}

/** 单条规则审核结果 */
export interface RecordCheckItem {
  key: CheckKey;
  label: string;
  passed: boolean;
  severity: Severity;
  /** 通过/不通过的客观说明 */
  message: string;
  /** 不通过时给出的整改建议 */
  suggestion: string;
}

/** 提取出的待整改问题 */
export interface AuditIssue {
  rule: CheckKey;
  severity: Severity;
  message: string;
  suggestion: string;
}

/** auditMedicalRecord 的输出 */
export interface AuditResult {
  checks: RecordCheckItem[];
  issues: AuditIssue[];
  passedCount: number;
  failedCount: number;
  /** 审核结论（"建议"性质，必须人工确认） */
  suggestion: string;
  /** 是否需要人工复核（存在任一 error 项即为 true） */
  needsManualReview: boolean;
}

/** scoreMedicalRecord 的输出 */
export interface Score {
  /** 得分 0-100 */
  total: number;
  /** 满分固定 100 */
  max: number;
  passedCount: number;
  failedCount: number;
  /** 建议等级：≥90 合格 / 70-89 需整改 / <70 不合格 */
  grade: '合格' | '需整改' | '不合格';
}

/* ------------------------------- 规则权重 --------------------------------- */

/** 各项权重，合计 100 */
const CHECK_WEIGHTS: Record<CheckKey, number> = {
  chief_complaint: 20,
  present_illness_timeline: 25,
  differential_diagnosis: 20,
  treatment_plan: 20,
  medication_indication: 15,
};

const CHECK_LABELS: Record<CheckKey, string> = {
  chief_complaint: '主诉完整性',
  present_illness_timeline: '现病史时间线',
  differential_diagnosis: '鉴别诊断',
  treatment_plan: '诊疗计划',
  medication_indication: '用药指征',
};

/* ----------------------------- 文本工具（纯） ----------------------------- */

const trim = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** 中文时间标记：3天 / 2小时 / 1周 / 5个月 / 1年 / 半月 / 突发 / 反复 */
const TIME_MARKER_RE = /\d+\s*(天|日|小时|分钟|周|个月|月|年)|起病|突发|反复|渐起|骤然/g;

/** 诊疗动作关键词 */
const TREATMENT_ACTION_RE = /检查|检验|治疗|用药|手术|随访|监测|对症|护理|会诊|抗感染|降压|降糖/;

/** 按常见分隔符切分多个诊断 */
const splitDiagnoses = (text: string): string[] =>
  text
    .split(/[,，、;；\n]|或|和|与/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

/* ----------------------------- 五条规则（纯） ----------------------------- */

/** 规则1：主诉完整性 —— 非空且含持续时间 */
function checkChiefComplaint(text: string): RecordCheckItem {
  const t = trim(text);
  if (!t) {
    return {
      key: 'chief_complaint', label: CHECK_LABELS.chief_complaint,
      passed: false, severity: 'error',
      message: '主诉为空',
      suggestion: '请补全主诉：应包含主要症状（或体征）+ 持续时间。',
    };
  }
  const hasDuration = /\d+\s*(天|日|小时|分钟|周|个月|月|年)/.test(t)
    || /起病|突发|反复|渐起/.test(t);
  if (!hasDuration) {
    return {
      key: 'chief_complaint', label: CHECK_LABELS.chief_complaint,
      passed: false, severity: 'warning',
      message: '主诉缺少症状持续时间',
      suggestion: '主诉建议写明"主要症状 + 持续时间"，例如：反复咳嗽咳痰3天。',
    };
  }
  return {
    key: 'chief_complaint', label: CHECK_LABELS.chief_complaint,
    passed: true, severity: 'warning',
    message: '主诉包含主要症状与持续时间',
    suggestion: '',
  };
}

/** 规则2：现病史时间线 —— 至少 2 个时间标记，体现起病与演变 */
function checkPresentIllness(text: string): RecordCheckItem {
  const t = trim(text);
  if (!t) {
    return {
      key: 'present_illness_timeline', label: CHECK_LABELS.present_illness_timeline,
      passed: false, severity: 'error',
      message: '现病史为空',
      suggestion: '请补全现病史：起病时间、诱因、主要症状特点与病情演变。',
    };
  }
  const markers = t.match(TIME_MARKER_RE) ?? [];
  if (markers.length < 2) {
    return {
      key: 'present_illness_timeline', label: CHECK_LABELS.present_illness_timeline,
      passed: false, severity: 'warning',
      message: `现病史时间标记仅 ${markers.length} 处，时间线不完整`,
      suggestion: '现病史建议按时间顺序写清"起病 → 演变 → 就诊前情况"，至少出现两个时间节点。',
    };
  }
  return {
    key: 'present_illness_timeline', label: CHECK_LABELS.present_illness_timeline,
    passed: true, severity: 'warning',
    message: `现病史含 ${markers.length} 处时间标记，时间线完整`,
    suggestion: '',
  };
}

/** 规则3：鉴别诊断 —— 至少列出 2 个待鉴别诊断 */
function checkDifferentialDiagnosis(text: string): RecordCheckItem {
  const t = trim(text);
  if (!t) {
    return {
      key: 'differential_diagnosis', label: CHECK_LABELS.differential_diagnosis,
      passed: false, severity: 'error',
      message: '鉴别诊断为空',
      suggestion: '请列出至少两个需与本诊断相鉴别的疾病及鉴别要点。',
    };
  }
  const candidates = splitDiagnoses(t);
  if (candidates.length < 2) {
    return {
      key: 'differential_diagnosis', label: CHECK_LABELS.differential_diagnosis,
      passed: false, severity: 'warning',
      message: `仅识别到 ${candidates.length} 个待鉴别诊断`,
      suggestion: '鉴别诊断建议 ≥2 个，并简述各自支持/不支持的依据。',
    };
  }
  return {
    key: 'differential_diagnosis', label: CHECK_LABELS.differential_diagnosis,
    passed: true, severity: 'warning',
    message: `鉴别诊断列出 ${candidates.length} 个疾病`,
    suggestion: '',
  };
}

/** 规则4：诊疗计划 —— 非空且含诊疗动作关键词 */
function checkTreatmentPlan(text: string): RecordCheckItem {
  const t = trim(text);
  if (!t) {
    return {
      key: 'treatment_plan', label: CHECK_LABELS.treatment_plan,
      passed: false, severity: 'error',
      message: '诊疗计划为空',
      suggestion: '请写明进一步检查、治疗措施与随访安排。',
    };
  }
  if (!TREATMENT_ACTION_RE.test(t)) {
    return {
      key: 'treatment_plan', label: CHECK_LABELS.treatment_plan,
      passed: false, severity: 'warning',
      message: '诊疗计划未体现明确诊疗动作',
      suggestion: '诊疗计划建议包含：完善检查 / 治疗用药 / 对症处理 / 病情监测等动作。',
    };
  }
  return {
    key: 'treatment_plan', label: CHECK_LABELS.treatment_plan,
    passed: true, severity: 'warning',
    message: '诊疗计划包含明确诊疗动作',
    suggestion: '',
  };
}

/** 规则5：用药指征 —— 每条用药均须写明用药指征 */
function checkMedicationIndication(
  medications: Array<{ name: string; indication?: string }>,
): RecordCheckItem {
  const list = Array.isArray(medications) ? medications : [];
  if (list.length === 0) {
    return {
      key: 'medication_indication', label: CHECK_LABELS.medication_indication,
      passed: true, severity: 'warning',
      message: '本次无用药，用药指征项不适用',
      suggestion: '',
    };
  }
  const missing = list.filter(
    (m) => !trim(m?.indication),
  );
  if (missing.length > 0) {
    const names = missing.map((m) => trim(m.name) || '未命名药物').join('、');
    return {
      key: 'medication_indication', label: CHECK_LABELS.medication_indication,
      passed: false, severity: 'error',
      message: `${missing.length} 条用药缺少指征：${names}`,
      suggestion: `请为以下用药补充用药指征：${names}（为何用、针对何诊断、预期目标）。`,
    };
  }
  return {
    key: 'medication_indication', label: CHECK_LABELS.medication_indication,
    passed: true, severity: 'warning',
    message: `全部 ${list.length} 条用药均写明指征`,
    suggestion: '',
  };
}

/* --------------------------- 纯函数：审核入口 ---------------------------- */

/**
 * 【核心业务深化】对一份病历跑全部质控规则。
 * 纯函数：不依赖时间/随机数/数据库，相同输入必得相同输出。
 */
export function auditMedicalRecord(recordContent: MedicalRecordContent): AuditResult {
  const content: MedicalRecordContent = {
    chiefComplaint: trim(recordContent?.chiefComplaint),
    presentIllness: trim(recordContent?.presentIllness),
    differentialDiagnosis: trim(recordContent?.differentialDiagnosis),
    treatmentPlan: trim(recordContent?.treatmentPlan),
    medications: Array.isArray(recordContent?.medications) ? recordContent.medications : [],
  };

  const checks: RecordCheckItem[] = [
    checkChiefComplaint(content.chiefComplaint),
    checkPresentIllness(content.presentIllness),
    checkDifferentialDiagnosis(content.differentialDiagnosis),
    checkTreatmentPlan(content.treatmentPlan),
    checkMedicationIndication(content.medications),
  ];

  const issues: AuditIssue[] = checks
    .filter((c) => !c.passed)
    .map((c) => ({
      rule: c.key,
      severity: c.severity,
      message: c.message,
      suggestion: c.suggestion,
    }));

  const failedCount = issues.length;
  const passedCount = checks.length - failedCount;
  const needsManualReview = checks.some((c) => !c.passed && c.severity === 'error');

  // 结论始终为"建议"：不自动判退，须人工确认
  const suggestion = failedCount === 0
    ? '各项要素完整，建议通过归档前质控（仍需质控医师人工确认）。'
    : `共 ${failedCount} 项待整改，建议退回经治医师补充完善后再行归档（系统仅给出建议，最终以人工确认为准）。`;

  return { checks, issues, passedCount, failedCount, suggestion, needsManualReview };
}

/* --------------------------- 纯函数：评分计算 ---------------------------- */

/**
 * 【核心业务深化】按各项权重计算 0-100 分与建议等级。
 * 纯函数：passed 项得满分权重，未 passed 项 0 分。
 */
export function scoreMedicalRecord(checkResults: RecordCheckItem[]): Score {
  const list = Array.isArray(checkResults) ? checkResults : [];
  let total = 0;
  let passedCount = 0;
  for (const c of list) {
    const weight = CHECK_WEIGHTS[c.key] ?? 0;
    if (c.passed) {
      total += weight;
      passedCount += 1;
    }
  }
  total = Math.max(0, Math.min(100, total));
  const failedCount = list.length - passedCount;
  let grade: Score['grade'] = '需整改';
  if (total >= 90) grade = '合格';
  else if (total < 70) grade = '不合格';
  return { total, max: 100, passedCount, failedCount, grade };
}

/* --------------------------- 持久化（路由调用） --------------------------- */

export class RecordQualityError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * 触发一次病历质控智能审核：纯函数审核 + 评分 → 落库 record_quality_check。
 * 审核结果为"建议"，落库 status='pending'，等待人工确认。
 */
export async function runAudit(
  createdBy: string,
  recordId: string,
  recordContent: MedicalRecordContent,
) {
  const audit = auditMedicalRecord(recordContent);
  const score = scoreMedicalRecord(audit.checks);

  const db = getDb();
  const rows = await db`
    INSERT INTO medmuse.record_quality_check
      (record_id, record_content, checks, score, grade, issues, suggestion, status, created_by)
    VALUES
      (${recordId},
       ${JSON.stringify(recordContent)}::jsonb,
       ${JSON.stringify(audit.checks)}::jsonb,
       ${score.total},
       ${score.grade},
       ${JSON.stringify(audit.issues)}::jsonb,
       ${audit.suggestion},
       'pending',
       ${createdBy})
    RETURNING
      id            AS "id",
      record_id     AS "recordId",
      score         AS "score",
      grade         AS "grade",
      status        AS "status",
      created_by    AS "createdBy",
      created_at    AS "createdAt"
  `;
  const row = (rows as unknown as Array<Record<string, unknown>>)[0];
  if (!row) throw new RecordQualityError(500, '质控审核结果写入未返回');

  return {
    id: Number(row.id),
    recordId: typeof row.recordId === 'string' ? row.recordId : '',
    checks: audit.checks,
    issues: audit.issues,
    score: score.total,
    max: score.max,
    passedCount: audit.passedCount,
    failedCount: audit.failedCount,
    grade: score.grade,
    suggestion: audit.suggestion,
    needsManualReview: audit.needsManualReview,
    status: 'pending',
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
  };
}
