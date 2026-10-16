/**
 * 健澜科技 jlmedaios - 区域健康大脑纯函数（M232-D）
 *
 * buildRegionalHealthBrainReport / coordinateReferral / assessRegionalSharing
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 协调双向转诊（纯函数）。
 *
 * @param patient 患者
 * @param from 转出机构
 * @param to 转入机构
 * @returns 转诊单
 */
export function coordinateReferral(patient: string, from: string, to: string): { referralId: string; status: string } {
  return { referralId: `REF-${Date.now()}`, status: `已从 ${from} 转诊至 ${to}` };
}

/**
 * 评估区域共享（纯函数）。
 *
 * @param data 共享数据量
 * @returns 共享水平
 */
export function assessRegionalSharing(data: number): { level: string; score: number } {
  let level = "初级";
  if (data >= 10000) level = "高级";
  else if (data >= 5000) level = "中级";
  return { level, score: data };
}

/** 区域健康大脑报告输出 */
export interface RegionalHealthBrainReport {
  timeRange: string;
  alliance: { unions: number; consortia: number; specialtyAlliances: number };
  referral: { primaryCare: number; twoWay: number };
  centers: { imaging: boolean; lab: boolean; pathology: boolean; mutualRecognition: boolean };
  platform: { healthInfo: boolean; supervision: boolean; internetHospital: boolean };
  suggestions: string[];
}

/**
 * 构建区域健康大脑报告。
 *
 * @param timeRange 时间范围
 * @returns 区域健康大脑报告
 */
export function buildRegionalHealthBrainReport(timeRange: string): RegionalHealthBrainReport {
  return {
    timeRange,
    alliance: { unions: 5, consortia: 3, specialtyAlliances: 10 },
    referral: { primaryCare: 8000, twoWay: 2000 },
    centers: { imaging: true, lab: true, pathology: true, mutualRecognition: true },
    platform: { healthInfo: true, supervision: true, internetHospital: true },
    suggestions: ["扩大区域检验中心覆盖", "推进基层首诊率提升"],
  };
}
