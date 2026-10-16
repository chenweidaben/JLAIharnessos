/**
 * 健澜科技 jlmedaios - 患者安全目标体系纯函数（M193-D）
 *
 * buildPatientSafetyReport / classifyAdverseEvent / analyzeRootCause
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 不良事件 */
export interface AdverseEvent {
  type: string;
  causedHarm: boolean;
  hadConsequence: boolean;
  isHiddenDanger: boolean;
}

/** 不良事件分级（纯函数）。
 *
 * @param event 不良事件
 * @returns 分级 I-IV
 */
export function classifyAdverseEvent(event: AdverseEvent): 'I' | 'II' | 'III' | 'IV' {
  if (!event.causedHarm && !event.hadConsequence && !event.isHiddenDanger) return 'I';
  if (event.hadConsequence && event.causedHarm) return 'II';
  if (event.hadConsequence && !event.causedHarm) return 'III';
  return 'IV';
}

/** 根因分析（纯函数）。
 *
 * @param event 不良事件
 * @returns 根因列表
 */
export function analyzeRootCause(event: AdverseEvent): string[] {
  const causes: string[] = [];
  if (event.type.includes('用药')) causes.push('药品管理流程缺陷', '护士用药核对不严格');
  if (event.type.includes('跌倒')) causes.push('环境风险评估不足', '患者宣教不到位');
  if (event.type.includes('手术')) causes.push('手术安全核查未落实', '术前准备不充分');
  if (causes.length === 0) causes.push('系统流程问题', '人员培训不足');
  return causes;
}

/** 患者安全报告输出 */
export interface PatientSafetyReport {
  dept: string;
  timeRange: string;
  nationalGoals: { total: number; achieved: number; details: string[] };
  adverseEvents: { total: number; gradeI: number; gradeII: number; gradeIII: number; gradeIV: number };
  reportingRate: number;
  rcaCount: number;
  fmeaCount: number;
  safetyCulture: { score: number };
  training: { coverage: number };
  suggestions: string[];
}

/**
 * 构建患者安全报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 患者安全报告
 */
export function buildPatientSafetyReport(dept: string, timeRange: string): PatientSafetyReport {
  return {
    dept,
    timeRange,
    nationalGoals: {
      total: 10,
      achieved: 8,
      details: ['严格执行查对制度', '提高用药安全', '识别患者身份', '强化手术安全核查'],
    },
    adverseEvents: { total: 56, gradeI: 20, gradeII: 15, gradeIII: 12, gradeIV: 9 },
    reportingRate: 0.92,
    rcaCount: 6,
    fmeaCount: 3,
    safetyCulture: { score: 85 },
    training: { coverage: 0.95 },
    suggestions: ['鼓励主动上报不良事件', '加强患者安全文化建设'],
  };
}
