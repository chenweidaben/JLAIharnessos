/**
 * 健澜科技 jlmedaios - 医院绩效管理纯函数（M189-A）
 *
 * buildPerformanceManagementReport / calculateDeptScore / calculateDoctorScore
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 科室绩效数据 */
export interface DeptPerfData {
  dept: string;
  outpatientVolume: number;
  inpatientVolume: number;
  surgeryVolume: number;
  drgWeight: number;
  satisfaction: number;
  qualityScore: number;
}

/** 医生绩效数据 */
export interface DoctorPerfData {
  doctor: string;
  dept: string;
  workload: number;
  qualityScore: number;
  patientRating: number;
  researchScore: number;
}

/** 权重 */
export interface PerfWeights {
  outpatient: number;
  inpatient: number;
  surgery: number;
  drg: number;
  satisfaction: number;
  quality: number;
}

/**
 * 科室绩效得分（纯函数）。
 *
 * @param data 科室数据
 * @param weights 权重
 * @returns 0-100 分
 */
export function calculateDeptScore(data: DeptPerfData, weights: PerfWeights): number {
  const score =
    data.outpatientVolume * 0.01 * weights.outpatient +
    data.inpatientVolume * 0.1 * weights.inpatient +
    data.surgeryVolume * 0.1 * weights.surgery +
    data.drgWeight * 10 * weights.drg +
    data.satisfaction * 100 * weights.satisfaction +
    data.qualityScore * weights.quality;
  return Math.round(Math.min(score, 100));
}

/**
 * 医生绩效得分（纯函数）。
 *
 * @param data 医生数据
 * @returns 0-100 分
 */
export function calculateDoctorScore(data: DoctorPerfData): number {
  const score =
    data.workload * 0.3 +
    data.qualityScore * 0.3 +
    data.patientRating * 0.3 +
    data.researchScore * 0.1;
  return Math.round(Math.min(score, 100));
}

/** 绩效报告输出 */
export interface PerfManagementReport {
  dept: string;
  timeRange: string;
  deptScore: number;
  deptRanking: Array<{ dept: string; score: number }>;
  doctorRanking: Array<{ doctor: string; dept: string; score: number }>;
  nurseRanking: Array<{ nurse: string; dept: string; score: number }>;
  suggestions: string[];
}

/**
 * 构建绩效管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 绩效报告
 */
export function buildPerformanceManagementReport(dept: string, timeRange: string): PerfManagementReport {
  const deptData: DeptPerfData = {
    dept,
    outpatientVolume: 3200,
    inpatientVolume: 280,
    surgeryVolume: 120,
    drgWeight: 1.2,
    satisfaction: 0.92,
    qualityScore: 88,
  };

  const weights: PerfWeights = {
    outpatient: 0.2,
    inpatient: 0.2,
    surgery: 0.15,
    drg: 0.15,
    satisfaction: 0.15,
    quality: 0.15,
  };

  const deptScore = calculateDeptScore(deptData, weights);

  const deptRanking = [
    { dept: '心内科', score: 92 },
    { dept: '骨科', score: 88 },
    { dept: '普外科', score: 85 },
    { dept, score: deptScore },
  ];

  const doctorRanking = [
    { doctor: '张医生', dept: '心内科', score: 95 },
    { doctor: '李医生', dept: '心内科', score: 90 },
  ];

  const nurseRanking = [
    { nurse: '王护士', dept: '心内科', score: 93 },
    { nurse: '赵护士', dept: '心内科', score: 88 },
  ];

  const suggestions: string[] = [];
  if (deptScore < 90) {
    suggestions.push(`科室绩效得分 ${deptScore}，低于 90 分目标，建议分析短板指标`);
  }
  suggestions.push('建议加强科研教学绩效激励');

  return {
    dept,
    timeRange,
    deptScore,
    deptRanking,
    doctorRanking,
    nurseRanking,
    suggestions,
  };
}
