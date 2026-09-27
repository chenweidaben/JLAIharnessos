/**
 * 健澜科技 jlmedaios - 运行病历质控规则引擎（M2-B）
 *
 * 依据《病历书写基本规范》对病历做确定性检查：
 *  - 完整性（completeness）：各病历类型必备段落是否存在、是否过短；
 *  - 时限（timeliness）：入院记录 24h、首次病程 8h、手术/出院记录 24h；
 *  - 缺陷（defect）：作者签名缺失、全文过短等。
 *
 * 纯函数、无 I/O、可重复；AI 辅助结果在聚合器另行合并并标注 source='ai'。
 * 引擎只给出问题与建议，质控结论必须由质控医师本人签名（AI 不产生结论）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type QcIssueCategory = 'completeness' | 'timeliness' | 'defect';
export type QcSeverity = 'block' | 'major' | 'minor';

export type QcIssue = {
  ruleId: string;
  category: QcIssueCategory;
  severity: QcSeverity;
  section?: string;
  message: string;
  source: 'rule' | 'ai';
};

export interface QcContext {
  /** 触发时限计算的事件时间（如入院/出院时间，ISO） */
  eventTime?: string | null;
  deadlineHours?: number;
  eventLabel?: string;
}

export interface RecordLike {
  recordType: string;
  content: Record<string, unknown> | null | undefined;
  plainText?: string | null;
  authorId?: string | null;
  createdAt?: string | null;
}

export interface QcEvaluation {
  issues: QcIssue[];
  score: number;
  canPass: boolean;
  blockCount: number;
  majorCount: number;
  minorCount: number;
}

/* ----------------------------- 段落定义 ----------------------------- */

interface SectionSpec {
  id: string;
  label: string;
  keys: string[];
  minLength: number;
  required: boolean;
}

function sec(id: string, label: string, keys: string[], required = true, minLength = 2): SectionSpec {
  return { id, label, keys, required, minLength };
}

const CHIEF = sec('chiefComplaint', '主诉', ['chiefComplaint', 'chief_complaint', '主诉']);
const PRESENT = sec('presentIllness', '现病史', ['presentIllness', 'present_illness', '现病史'], true, 10);
const PAST = sec('pastHistory', '既往史', ['pastHistory', 'past_history', 'pastHistoryText', '既往史'], false, 4);
const PHYSICAL = sec('physicalExam', '体格检查', ['physicalExam', 'physical_exam', '体格检查'], true, 4);
const AUX = sec('auxiliaryExam', '辅助检查', ['auxiliaryExam', 'auxiliary_exam', '辅助检查'], false, 2);
const DIAG = sec('diagnosis', '诊断', ['diagnosis', 'diagnosisText', '初步诊断', '诊断'], true, 2);
const TREAT = sec('treatment', '处理计划', ['treatment', 'treatmentPlan', '处理计划', '治疗计划'], true, 2);

const PRE_OP = sec('preOpDiagnosis', '术前诊断', ['preOpDiagnosis', 'pre_op_diagnosis', '术前诊断']);
const POST_OP = sec('postOpDiagnosis', '术后诊断', ['postOpDiagnosis', 'post_op_diagnosis', '术后诊断']);
const SURGERY = sec('surgeryName', '手术名称', ['surgeryName', 'surgery_name', '手术名称']);
const SURGEON = sec('surgeon', '术者', ['surgeon', 'operator', 'operatorSurgeon', '术者']);
const ANESTH = sec('anesthesia', '麻醉方式', ['anesthesia', 'anesthesiaMethod', '麻醉方式', '麻醉']);
const PROCEDURE = sec('procedureDescription', '手术经过', ['procedureDescription', 'surgeryProcedure', 'operationNote', '手术经过', '手术记录'], true, 20);

const ADM_DATE = sec('admissionDate', '入院日期', ['admissionDate', 'admission_date', '入院日期']);
const DIS_DATE = sec('dischargeDate', '出院日期', ['dischargeDate', 'discharge_date', '出院日期']);
const ADM_DIAG = sec('admissionDiagnosis', '入院诊断', ['admissionDiagnosis', 'admission_diagnosis', '入院诊断']);
const DIS_DIAG = sec('dischargeDiagnosis', '出院诊断', ['dischargeDiagnosis', 'discharge_diagnosis', '出院诊断']);
const HOSP_COURSE = sec('hospitalCourse', '诊疗经过', ['hospitalCourse', 'hospital_course', '诊疗经过'], true, 10);
const DIS_COND = sec('dischargeCondition', '出院情况', ['dischargeCondition', 'discharge_condition', '出院情况']);
const DIS_ORDERS = sec('dischargeOrders', '出院医嘱', ['dischargeOrders', 'discharge_orders', '出院医嘱']);

/** 各病历类型的段落规范与全文最低字数 */
const TYPE_SPECS: Record<string, { sections: SectionSpec[]; minTotal: number }> = {
  outpatient: {
    sections: [CHIEF, PRESENT, PAST, PHYSICAL, AUX, DIAG, TREAT],
    minTotal: 80,
  },
  admission: {
    sections: [CHIEF, PRESENT, PAST, PHYSICAL, AUX, DIAG, TREAT],
    minTotal: 150,
  },
  progress: { sections: [], minTotal: 60 },
  operative: {
    sections: [PRE_OP, POST_OP, SURGERY, SURGEON, ANESTH, PROCEDURE],
    minTotal: 150,
  },
  discharge: {
    sections: [ADM_DATE, DIS_DATE, ADM_DIAG, DIS_DIAG, HOSP_COURSE, DIS_COND, DIS_ORDERS],
    minTotal: 120,
  },
  front_page: { sections: [], minTotal: 60 },
};

/* ----------------------------- 文本工具 ----------------------------- */

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/** 按候选键取段落文本（兼容嵌套，如 sections 包裹）。 */
export function getSectionText(content: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = toText(content[key]).trim();
    if (direct) return direct;
  }
  // 兼容 { sections: { key: ... } } 结构
  const sections = content.sections;
  if (sections && typeof sections === 'object') {
    for (const key of keys) {
      const nested = toText((sections as Record<string, unknown>)[key]).trim();
      if (nested) return nested;
    }
  }
  return '';
}

function flattenContent(content: Record<string, unknown>): string {
  return Object.values(content).map(toText).join(' ').replace(/\s+/g, ' ').trim();
}

/* ----------------------------- 主入口 ----------------------------- */

export function evaluateRecord(record: RecordLike, context?: QcContext): QcEvaluation {
  const issues: QcIssue[] = [];
  const content = record.content ?? {};
  const bodyText = (record.plainText?.trim() || flattenContent(content) || '').trim();
  const spec = TYPE_SPECS[record.recordType] ?? { sections: [], minTotal: 40 };

  // 1) 作者签名缺失（医疗文书须本人负责）
  if (!record.authorId) {
    issues.push({
      ruleId: 'record.author.missing', category: 'defect', severity: 'major',
      message: '病历缺少作者签名信息，无法确认责任人', source: 'rule',
    });
  }

  // 2) 全文为空 / 过短
  if (bodyText.length < 20) {
    issues.push({
      ruleId: 'record.empty', category: 'completeness', severity: 'block',
      message: '病历正文为空或近乎空白，不具备质控条件', source: 'rule',
    });
  } else if (bodyText.length < spec.minTotal) {
    issues.push({
      ruleId: 'record.too_short', category: 'completeness', severity: 'major',
      message: `病历全文过短（${bodyText.length} 字），低于该类型建议的 ${spec.minTotal} 字`,
      source: 'rule',
    });
  }

  // 3) 段落完整性
  for (const s of spec.sections) {
    const text = getSectionText(content, s.keys);
    if (!text) {
      if (s.required) {
        issues.push({
          ruleId: `${record.recordType}.${s.id}.missing`, category: 'completeness',
          severity: 'block', section: s.id,
          message: `缺少必备段落：${s.label}`, source: 'rule',
        });
      } else {
        issues.push({
          ruleId: `${record.recordType}.${s.id}.missing`, category: 'completeness',
          severity: 'minor', section: s.id,
          message: `建议补充段落：${s.label}`, source: 'rule',
        });
      }
    } else if (text.replace(/\s/g, '').length < s.minLength) {
      issues.push({
        ruleId: `${record.recordType}.${s.id}.too_short`, category: 'completeness',
        severity: 'major', section: s.id,
        message: `段落「${s.label}」内容过短，描述不充分`, source: 'rule',
      });
    }
  }

  // 4) 时限检查
  if (context?.eventTime && context.deadlineHours && record.createdAt) {
    const eventMs = new Date(context.eventTime).getTime();
    const recordMs = new Date(record.createdAt).getTime();
    if (!Number.isNaN(eventMs) && !Number.isNaN(recordMs)) {
      const hours = (recordMs - eventMs) / 3_600_000;
      if (hours > context.deadlineHours) {
        issues.push({
          ruleId: 'record.timeliness.overdue', category: 'timeliness', severity: 'major',
          message: `${context.eventLabel ?? '该病历'}未在规定 ${context.deadlineHours} 小时内完成（实际约 ${hours.toFixed(1)} 小时）`,
          source: 'rule',
        });
      }
    }
  }

  // 5) 计分与结论建议
  let blockCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  for (const i of issues) {
    if (i.severity === 'block') blockCount += 1;
    else if (i.severity === 'major') majorCount += 1;
    else minorCount += 1;
  }
  const rawScore = 100 - blockCount * 15 - majorCount * 8 - minorCount * 3;
  const score = Math.max(0, Math.min(100, rawScore));
  return {
    issues, score, canPass: blockCount === 0 && majorCount === 0,
    blockCount, majorCount, minorCount,
  };
}

/** 质控时限规则（供聚合器按病历类型取参数） */
export const TIMELINESS_RULES: Record<string, { deadlineHours: number; label: string }> = {
  admission: { deadlineHours: 24, label: '入院记录' },
  progress: { deadlineHours: 8, label: '首次病程记录' },
  operative: { deadlineHours: 24, label: '手术记录' },
  discharge: { deadlineHours: 24, label: '出院记录' },
};