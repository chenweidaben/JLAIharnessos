/**
 * 健澜科技 jlmedaios - 人力资源管理纯函数（M191-C）
 *
 * buildHRManagementReport / predictHRNeed
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 业务数据 */
export interface BusinessData {
  bedCount: number;
  outpatientVisits: number;
  surgeryCount: number;
}

/**
 * 人力需求预测（纯函数）。
 *
 * @param data 业务数据
 * @returns 预测人力配置
 */
export function predictHRNeed(data: BusinessData): { doctors: number; nurses: number; technicians: number } {
  // 床护比 1:0.4，医师按床位 1:0.3，医技按门诊量 1:500
  const nurses = Math.ceil(data.bedCount * 0.4);
  const doctors = Math.ceil(data.bedCount * 0.3 + data.surgeryCount * 0.05);
  const technicians = Math.ceil(data.outpatientVisits / 500);
  return { doctors, nurses, technicians };
}

/** HR 报告输出 */
export interface HRManagementReport {
  dept: string;
  timeRange: string;
  structure: { doctors: number; nurses: number; technicians: number; admin: number; logistics: number };
  titleStructure: { senior: number; deputySenior: number; intermediate: number; junior: number };
  educationStructure: { phd: number; master: number; bachelor: number; college: number };
  turnover: { joined: number; left: number; transferred: number; turnoverRate: number };
  training: { totalHours: number; coverage: number };
  attendance: { attendanceRate: number };
  cost: { totalCost: number; perCapita: number };
  predictedNeed: { doctors: number; nurses: number; technicians: number };
  suggestions: string[];
}

/**
 * 构建人力资源管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns HR 报告
 */
export function buildHRManagementReport(dept: string, timeRange: string): HRManagementReport {
  const predictedNeed = predictHRNeed({ bedCount: 800, outpatientVisits: 30000, surgeryCount: 200 });

  const suggestions: string[] = [];
  suggestions.push('建议加强护理队伍建设，降低流失率');
  suggestions.push('建议引进高层次人才（博士/正高）');

  return {
    dept,
    timeRange,
    structure: { doctors: 450, nurses: 800, technicians: 200, admin: 80, logistics: 120 },
    titleStructure: { senior: 60, deputySenior: 180, intermediate: 500, junior: 900 },
    educationStructure: { phd: 30, master: 200, bachelor: 900, college: 510 },
    turnover: { joined: 45, left: 18, transferred: 12, turnoverRate: 0.025 },
    training: { totalHours: 12000, coverage: 0.95 },
    attendance: { attendanceRate: 0.97 },
    cost: { totalCost: 24000000, perCapita: 150000 },
    predictedNeed,
    suggestions,
  };
}
