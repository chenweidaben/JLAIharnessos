/**
 * 健澜科技 jlmedaios - 多院区一体化运行 V5 纯函数（M273-A）
 *
 * assignCampusV5 / compareCampusV5 / buildMultiCampusV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 院区分配 V5（纯函数）。
 *
 * @param patient 患者
 * @param service 服务类型
 * @param preference 偏好院区
 * @returns 分配结果
 */
export function assignCampusV5(patient: string, service: string, preference: string): { patient: string; campus: string; reason: string } {
  let campus = preference;
  let reason = "就近偏好";
  if (service === "急诊" || service === "危重症") {
    campus = "本部院区";
    reason = "急危重症需本部";
  } else if (service === "体检" || service === "康复") {
    campus = "分院区";
    reason = "非急重症分院";
  }
  return { patient, campus, reason };
}

/**
 * 院区对比 V5（纯函数）。
 *
 * @param metrics 各院区指标
 * @returns 对比
 */
export function compareCampusV5(metrics: { name: string; opd: number; inpatient: number; cost: number }[]): { best: string; gap: number } {
  let best = metrics[0]?.name ?? "";
  let minCost = metrics[0]?.cost ?? 0;
  for (const m of metrics) {
    if (m.cost < minCost) {
      minCost = m.cost;
      best = m.name;
    }
  }
  const avgOpd = Math.round(metrics.reduce((s, m) => s + m.opd, 0) / Math.max(metrics.length, 1));
  const gap = avgOpd - (metrics.find((m) => m.name === best)?.opd ?? 0);
  return { best, gap };
}

/** 多院区一体化运行 V5 报告输出 */
export interface MultiCampusV5Report {
  timeRange: string;
  campus: { multiCampus: number; positioning: number; function: number; bed: number; deptDistribution: number; unifiedPortal: number };
  portal: { sso: number; unifiedSlot: number; unifiedEmpi: number; unifiedData: number };
  slot: { multiSitePractice: number; campusSchedule: number; slotSharing: number; crossCampusBooking: number };
  data: { dataCenter: number; crossCampusQuery: number; labRecognition: number; imagingSharing: number };
  ops: { opdVolume: number; inpatientVolume: number; surgeryVolume: number; revenue: number; cost: number; comparison: number; benchmark: number };
  patient: { nearestCare: number; crossCampusSettlement: number; continuousRecord: number; testRecognition: number; navigation: number };
  collaboration: { mdtCrossCampus: number; teleconsult: number; surgeryLive: number; teachingSharing: number };
  metrics: { integrationRate: number; recognitionRate: number; crossCampusVisits: number; cost: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建多院区一体化运行 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildMultiCampusV5Report(timeRange: string): MultiCampusV5Report {
  return {
    timeRange,
    campus: { multiCampus: 3, positioning: 3, function: 3, bed: 2000, deptDistribution: 1, unifiedPortal: 1 },
    portal: { sso: 1, unifiedSlot: 1, unifiedEmpi: 1, unifiedData: 1 },
    slot: { multiSitePractice: 150, campusSchedule: 3, slotSharing: 1, crossCampusBooking: 200 },
    data: { dataCenter: 1, crossCampusQuery: 5000, labRecognition: 1, imagingSharing: 1 },
    ops: { opdVolume: 30000, inpatientVolume: 2000, surgeryVolume: 800, revenue: 1, cost: 1, comparison: 1, benchmark: 1 },
    patient: { nearestCare: 1, crossCampusSettlement: 1, continuousRecord: 1, testRecognition: 1, navigation: 1 },
    collaboration: { mdtCrossCampus: 30, teleconsult: 100, surgeryLive: 10, teachingSharing: 50 },
    metrics: { integrationRate: 85, recognitionRate: 90, crossCampusVisits: 5, cost: 12, satisfaction: 88 },
    suggestions: [
      "推进跨院区检查结果互认",
      "扩大号源共享覆盖",
      "降低跨院区运营成本",
    ],
  };
}
