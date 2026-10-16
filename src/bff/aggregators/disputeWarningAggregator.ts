/**
 * 健澜科技 jlmedaios - 医疗纠纷预警纯函数（M188-D）
 *
 * buildMedicalDisputeWarning / predictDisputeRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者记录 */
export interface PatientRecord {
  patientId: string;
  dept: string;
  doctor: string;
  diagnosis: string;
  hadComplication: boolean;
  hadCommunicationIssue: boolean;
  totalCost: number;
  previousComplaints: number;
}

/**
 * 纠纷风险预测（纯函数）。
 *
 * @param record 患者记录
 * @returns 风险等级
 */
export function predictDisputeRisk(record: PatientRecord): { level: 'low' | 'medium' | 'high'; reason: string } {
  if (record.hadComplication) {
    return { level: 'high', reason: '发生并发症，纠纷风险高' };
  }
  if (record.hadCommunicationIssue || record.previousComplaints > 0) {
    return { level: 'medium', reason: '存在沟通问题或既往投诉史' };
  }
  if (record.totalCost > 50000) {
    return { level: 'medium', reason: `费用 ${record.totalCost} 元，高额费用易引发纠纷` };
  }
  return { level: 'low', reason: '诊疗过程顺利，无明显风险因素' };
}

/** 纠纷预警报告输出 */
export interface MedicalDisputeWarningReport {
  timeRange: string;
  complaintRate: number;
  disputeRate: number;
  totalCompensation: number;
  highRiskDepts: Array<{ dept: string; count: number }>;
  highRiskDoctors: Array<{ doctor: string; count: number }>;
  disputeCauses: Array<{ cause: string; count: number }>;
  predictedRiskCases: Array<{ patientId: string; level: string; reason: string }>;
  suggestions: string[];
}

/**
 * 构建医疗纠纷预警报告。
 *
 * @param timeRange 时间范围
 * @returns 纠纷预警报告
 */
export function buildMedicalDisputeWarning(timeRange: string): MedicalDisputeWarningReport {
  const sampleRecords: PatientRecord[] = [
    { patientId: 'p1', dept: '骨科', doctor: '张医生', diagnosis: '骨折', hadComplication: true, hadCommunicationIssue: false, totalCost: 30000, previousComplaints: 0 },
    { patientId: 'p2', dept: '普外科', doctor: '李医生', diagnosis: '阑尾炎', hadComplication: false, hadCommunicationIssue: true, totalCost: 12000, previousComplaints: 1 },
    { patientId: 'p3', dept: '心内科', doctor: '王医生', diagnosis: '冠心病', hadComplication: false, hadCommunicationIssue: false, totalCost: 60000, previousComplaints: 0 },
  ];

  const predictedRiskCases = sampleRecords.map((r) => {
    const risk = predictDisputeRisk(r);
    return { patientId: r.patientId, level: risk.level, reason: risk.reason };
  });

  const suggestions: string[] = [];
  if (predictedRiskCases.some((c) => c.level === 'high')) {
    suggestions.push('存在高风险病例，建议科主任提前介入沟通');
  }
  suggestions.push('建议加强术前知情同意书签署规范');

  return {
    timeRange,
    complaintRate: 0.015,
    disputeRate: 0.003,
    totalCompensation: 280000,
    highRiskDepts: [
      { dept: '骨科', count: 5 },
      { dept: '普外科', count: 3 },
    ],
    highRiskDoctors: [
      { doctor: '张医生', count: 3 },
      { doctor: '李医生', count: 2 },
    ],
    disputeCauses: [
      { cause: '服务态度', count: 8 },
      { cause: '医疗质量', count: 6 },
      { cause: '沟通不畅', count: 5 },
      { cause: '费用问题', count: 3 },
    ],
    predictedRiskCases,
    suggestions,
  };
}
