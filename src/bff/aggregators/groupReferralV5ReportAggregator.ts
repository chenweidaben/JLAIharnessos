/**
 * 健澜科技 jlmedaios - 集团患者转诊与资源调度 V5 纯函数（M273-D）
 *
 * routeGroupPatientV5 / scheduleGroupResourceV5 / buildGroupReferralV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 集团转诊 V5（纯函数）。
 *
 * @param patient 患者
 * @param resources 各院区床位可用数
 * @returns 转诊结果
 */
export function routeGroupPatientV5(patient: string, resources: { campus: string; beds: number }[]): { patient: string; campus: string; waitTime: number } {
  let best = resources[0]?.campus ?? "";
  let maxBeds = resources[0]?.beds ?? 0;
  for (const r of resources) {
    if (r.beds > maxBeds) {
      maxBeds = r.beds;
      best = r.campus;
    }
  }
  const waitTime = maxBeds > 10 ? 0 : 3;
  return { patient, campus: best, waitTime };
}

/**
 * 集团资源调度 V5（纯函数）。
 *
 * @param resources 资源总量
 * @param demand 需求量
 * @returns 调度结果
 */
export function scheduleGroupResourceV5(resources: number, demand: number): { allocated: number; utilization: number; shortage: number } {
  const allocated = Math.min(resources, demand);
  const utilization = resources > 0 ? Math.round((allocated / resources) * 1000) / 10 : 0;
  const shortage = Math.max(demand - resources, 0);
  return { allocated, utilization, shortage };
}

/** 集团患者转诊与资源调度 V5 报告输出 */
export interface GroupReferralV5Report {
  timeRange: string;
  intraGroup: { upReferral: number; downReferral: number; crossCampus: number; bedReservation: number; testBooking: number; greenChannel: number };
  resourceScheduling: { bed: number; orRoom: number; expert: number; equipment: number; crossCampusRealtime: number };
  expertSharing: { multiSitePractice: number; crossCampusOutpatient: number; surgeryTeaching: number; mdt: number; remote: number };
  testSharing: { imaging: number; lab: number; pathology: number; crossCampusSubmission: number; resultRecognition: number; logistics: number };
  closedLoop: { referralRequest: number; reception: number; followup: number; feedback: number; quality: number; fee: number };
  medicalCenter: { criticalCare: number; lab: number; imaging: number; pathology: number; dataSharing: number };
  smartScheduling: { aiRecommend: number; resourceMatching: number; waitTime: number; optimalPath: number };
  metrics: { intraGroupReferralVolume: number; avgWait: number; bedTurnover: number; resourceUtilization: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建集团患者转诊与资源调度 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildGroupReferralV5Report(timeRange: string): GroupReferralV5Report {
  return {
    timeRange,
    intraGroup: { upReferral: 200, downReferral: 150, crossCampus: 350, bedReservation: 100, testBooking: 200, greenChannel: 80 },
    resourceScheduling: { bed: 2000, orRoom: 50, expert: 300, equipment: 500, crossCampusRealtime: 1 },
    expertSharing: { multiSitePractice: 150, crossCampusOutpatient: 100, surgeryTeaching: 30, mdt: 50, remote: 80 },
    testSharing: { imaging: 300, lab: 500, pathology: 80, crossCampusSubmission: 100, resultRecognition: 1, logistics: 1 },
    closedLoop: { referralRequest: 350, reception: 340, followup: 300, feedback: 250, quality: 1, fee: 1 },
    medicalCenter: { criticalCare: 1, lab: 1, imaging: 1, pathology: 1, dataSharing: 1 },
    smartScheduling: { aiRecommend: 1, resourceMatching: 1, waitTime: 1, optimalPath: 1 },
    metrics: { intraGroupReferralVolume: 350, avgWait: 1.5, bedTurnover: 8, resourceUtilization: 85, satisfaction: 87 },
    suggestions: [
      "扩大集团内绿通转诊",
      "提升跨院区资源实时调度",
      "推广检查结果互认与物流",
    ],
  };
}
