/**
 * 健澜科技 jlmedaios - 安宁疗护纯函数（M220-D）
 *
 * buildHospiceReport / assessPain / buildHospiceCarePlan
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估疼痛（纯函数）。
 *
 * @param score 疼痛评分（0-10）
 * @param scale 量表类型
 * @returns 疼痛等级
 */
export function assessPain(score: number, scale: string): { level: string; controlled: boolean } {
  let level = '无痛';
  if (score >= 7) level = '重度';
  else if (score >= 4) level = '中度';
  else if (score >= 1) level = '轻度';
  return { level, controlled: score <= 3 };
}

/**
 * 构建安宁疗护计划（纯函数）。
 *
 * @param patient 患者数
 * @param family 家属数
 * @returns 计划
 */
export function buildHospiceCarePlan(patient: number, family: number): { team: string[]; services: string[] } {
  const team = ['医生', '护士', '社工', '营养师', '心理师'];
  const services = ['症状管理', '心理辅导', '哀伤辅导', 'DNR指导'];
  return { team, services };
}

/** 安宁疗护报告输出 */
export interface HospiceReport {
  timeRange: string;
  concept: { wholePerson: boolean; wholeFamily: boolean };
  symptom: { pain: number; dyspnea: number; delirium: number };
  psych: { counseling: number };
  ethics: { dnr: number; advanceDirective: number };
  team: { members: number };
  ward: { beds: number };
  deathEducation: { sessions: number };
  quality: { score: number };
  suggestions: string[];
}

/**
 * 构建安宁疗护报告。
 *
 * @param timeRange 时间范围
 * @returns 安宁疗护报告
 */
export function buildHospiceReport(timeRange: string): HospiceReport {
  return {
    timeRange,
    concept: { wholePerson: true, wholeFamily: true },
    symptom: { pain: 50, dyspnea: 20, delirium: 10 },
    psych: { counseling: 30 },
    ethics: { dnr: 25, advanceDirective: 15 },
    team: { members: 15 },
    ward: { beds: 10 },
    deathEducation: { sessions: 8 },
    quality: { score: 90 },
    suggestions: ['扩大居家安宁服务', '加强死亡教育'],
  };
}
