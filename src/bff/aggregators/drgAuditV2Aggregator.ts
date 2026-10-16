/**
 * 健澜科技 jlmedaios - DRG/DIP 医保智能审核纯函数（M187-D）
 *
 * buildDRGAuditReport / detectHighCoding / predictRejectionRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 病案记录 */
export interface DRGRecord {
  recordId: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  procedures: string[];
  hospitalDays: number;
  totalCost: number;
  expectedDRGWeight: number;
  actualDRGWeight: number;
}

/**
 * 高套分值检测（纯函数）。
 *
 * @param records 病案列表
 * @returns 疑似高套分值的记录
 */
export function detectHighCoding(records: DRGRecord[]): Array<{ recordId: string; reason: string; severity: 'low' | 'medium' | 'high' }> {
  const alerts: Array<{ recordId: string; reason: string; severity: 'low' | 'medium' | 'high' }> = [];

  for (const r of records) {
    // 诊断升级：主诊断与合并诊断严重程度不匹配
    if (r.actualDRGWeight > r.expectedDRGWeight * 1.5) {
      alerts.push({
        recordId: r.recordId,
        reason: `实际DRG权重 ${r.actualDRGWeight} 远高于预期 ${r.expectedDRGWeight}，疑似诊断升级`,
        severity: 'high',
      });
    }
    // 低标入院：住院日过短但费用高
    if (r.hospitalDays <= 2 && r.totalCost > 10000) {
      alerts.push({
        recordId: r.recordId,
        reason: `住院仅${r.hospitalDays}天但费用${r.totalCost}元，疑似低标入院`,
        severity: 'medium',
      });
    }
  }

  return alerts;
}

/**
 * 拒付风险预测（纯函数）。
 *
 * @param record 病案记录
 * @returns 风险等级和原因
 */
export function predictRejectionRisk(record: DRGRecord): { risk: 'low' | 'medium' | 'high'; reason: string } {
  if (record.actualDRGWeight > record.expectedDRGWeight * 1.3) {
    return { risk: 'high', reason: 'DRG 权重异常偏高，医保审核拒付概率大' };
  }
  if (record.hospitalDays < 2) {
    return { risk: 'medium', reason: '住院日过短，可能被认定为低标入院' };
  }
  return { risk: 'low', reason: '病案要素完整，DRG 入组合理' };
}

/** DRG 审核报告输出 */
export interface DRGAuditReport {
  timeRange: string;
  totalRecords: number;
  highCodingAlerts: Array<{ recordId: string; reason: string; severity: 'low' | 'medium' | 'high' }>;
  lowAdmissionCount: number;
  breakdownCount: number;
  rejectionRiskDistribution: { low: number; medium: number; high: number };
  suggestions: string[];
}

/**
 * 构建 DRG 审核报告。
 *
 * @param timeRange 时间范围
 * @returns 审核报告
 */
export function buildDRGAuditReport(timeRange: string): DRGAuditReport {
  const records: DRGRecord[] = [
    {
      recordId: 'rec-001',
      primaryDiagnosis: '冠心病',
      secondaryDiagnoses: ['高血压'],
      procedures: ['PCI'],
      hospitalDays: 7,
      totalCost: 45000,
      expectedDRGWeight: 1.5,
      actualDRGWeight: 2.8,
    },
    {
      recordId: 'rec-002',
      primaryDiagnosis: '肺炎',
      secondaryDiagnoses: [],
      procedures: [],
      hospitalDays: 1,
      totalCost: 15000,
      expectedDRGWeight: 0.5,
      actualDRGWeight: 0.6,
    },
    {
      recordId: 'rec-003',
      primaryDiagnosis: '糖尿病',
      secondaryDiagnoses: [],
      procedures: [],
      hospitalDays: 5,
      totalCost: 8000,
      expectedDRGWeight: 0.8,
      actualDRGWeight: 0.85,
    },
  ];

  const highCodingAlerts = detectHighCoding(records);
  const riskDist = { low: 0, medium: 0, high: 0 };
  for (const r of records) {
    const risk = predictRejectionRisk(r);
    riskDist[risk.risk] += 1;
  }

  const suggestions: string[] = [];
  if (highCodingAlerts.length > 0) {
    suggestions.push(`发现 ${highCodingAlerts.length} 条高套分值疑似记录，建议病案室复核`);
  }
  if (riskDist.high > 0) {
    suggestions.push(`${riskDist.high} 条记录拒付风险高，建议提前与医保沟通`);
  }

  return {
    timeRange,
    totalRecords: records.length,
    highCodingAlerts,
    lowAdmissionCount: records.filter((r) => r.hospitalDays <= 2).length,
    breakdownCount: 0,
    rejectionRiskDistribution: riskDist,
    suggestions,
  };
}
