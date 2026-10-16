/**
 * 健澜科技 jlmedaios - 介入诊疗与内镜中心纯函数（M203-B）
 *
 * buildInterventionalReport / classifyInterventionalRisk / assessEndoscopyQuality
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 手术数据 */
export interface ProcedureData {
  type: 'PCI' | '取栓' | 'TACE' | 'ERCP' | 'ESD' | 'EMR';
  durationMin: number;
  patientAge: number;
}

/**
 * 介入手术风险分级（纯函数）。
 *
 * @param procedure 手术数据
 * @returns 风险等级
 */
export function classifyInterventionalRisk(procedure: ProcedureData): { level: string; riskScore: number } {
  let riskScore = 0;
  if (procedure.patientAge >= 70) riskScore += 2;
  if (procedure.durationMin >= 120) riskScore += 2;
  if (procedure.type === '取栓' || procedure.type === 'ESD') riskScore += 2;
  else if (procedure.type === 'PCI' || procedure.type === 'ERCP') riskScore += 1;

  let level = '低风险';
  if (riskScore >= 4) level = '高风险';
  else if (riskScore >= 2) level = '中风险';
  return { level, riskScore };
}

/**
 * 评估内镜质量（纯函数）。
 *
 * @param procedure 内镜手术
 * @returns 质量评估
 */
export function assessEndoscopyQuality(procedure: ProcedureData): { quality: string; issues: string[] } {
  const issues: string[] = [];
  if (procedure.durationMin > 90) issues.push('手术时间偏长');
  if (procedure.type === 'ESD' && procedure.durationMin > 120) issues.push('ESD 时间超 2 小时');
  let quality = '优秀';
  if (issues.length >= 2) quality = '待改进';
  else if (issues.length === 1) quality = '良好';
  return { quality, issues };
}

/** 介入内镜报告输出 */
export interface InterventionalReport {
  timeRange: string;
  cardiac: { pci: number; pacemaker: number; ablation: number };
  neuro: { angiography: number; thrombectomy: number; aneurysm: number };
  tumor: { tace: number; rfa: number; seed: number };
  endoscopy: { gastroscopy: number; colonoscopy: number; ercp: number; esd: number };
  quality: { successRate: number; complicationRate: number; avgDurationMin: number };
  suggestions: string[];
}

/**
 * 构建介入内镜报告。
 *
 * @param timeRange 时间范围
 * @returns 介入内镜报告
 */
export function buildInterventionalReport(timeRange: string): InterventionalReport {
  return {
    timeRange,
    cardiac: { pci: 200, pacemaker: 50, ablation: 80 },
    neuro: { angiography: 150, thrombectomy: 30, aneurysm: 20 },
    tumor: { tace: 60, rfa: 40, seed: 15 },
    endoscopy: { gastroscopy: 3000, colonoscopy: 1500, ercp: 200, esd: 100 },
    quality: { successRate: 0.96, complicationRate: 0.02, avgDurationMin: 45 },
    suggestions: ['提高 ESD 完成率', '降低 PCI 并发症'],
  };
}
