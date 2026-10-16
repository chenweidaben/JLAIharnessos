/**
 * 健澜科技 jlmedaios - 家庭医生签约服务 V5 纯函数（M262-C）
 *
 * buildFamilyDoctorV5Report / assignFamilyDoctorV5 / planFollowupV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 分配家庭医生 V5（纯函数）。
 *
 * @param resident 居民
 * @param team 团队
 * @returns 分配
 */
export function assignFamilyDoctorV5(resident: { age: number; chronic: number }, team: { gp: string; capacity: number }): { doctor: string; packageType: string; reason: string } {
  let packageType = "基础包";
  let reason = "普通居民";
  if (resident.age >= 65 || resident.chronic >= 2) {
    packageType = "重点人群包";
    reason = "老年/慢病";
  }
  if (team.capacity < 10) {
    return { doctor: "待分配", packageType, reason: "团队容量不足" };
  }
  return { doctor: team.gp, packageType, reason };
}

/**
 * 规划随访 V5（纯函数）。
 *
 * @param resident 居民
 * @param condition 病情
 * @returns 随访
 */
export function planFollowupV5(resident: { chronic: number }, condition: { stable: boolean }): { frequency: string; channel: string; focus: string[] } {
  let frequency = "每季度";
  let channel = "上门";
  const focus: string[] = ["血压监测", "用药指导"];
  if (resident.chronic >= 2) {
    frequency = "每月";
  }
  if (!condition.stable) {
    frequency = "每两周";
    channel = "电话+上门";
    focus.push("症状评估");
  }
  return { frequency, channel, focus };
}

/** 家庭医生签约服务 V5 报告输出 */
export interface FamilyDoctorV5Report {
  timeRange: string;
  sign: { package: number; team: number; resident: number; priority: number; signRate: number; renewalRate: number };
  healthMgmt: { record: number; chronic: number; annualExam: number; education: number; followup: number };
  homeService: { homebed: number; homeVisit: number; nursing: number; rehab: number; hospice: number };
  package: { basic: number; value: number; insurance: number; publicHealth: number; personalized: number };
  team: { gp: number; specialty: number; nurse: number; publicHealth: number; pharmacist: number; it: number };
  kpi: { sign: number; healthIndicator: number; satisfaction: number; cost: number; firstVisit: number; referral: number };
  residentApp: { miniApp: number; healthData: number; doctorConsult: number; appointment: number; followup: number };
  outcome: { chronicControl: number; firstVisit: number; cost: number; satisfaction: number; literacy: number };
  suggestions: string[];
}

/**
 * 构建家庭医生签约服务 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 家庭医生签约服务 V5 报告
 */
export function buildFamilyDoctorV5Report(timeRange: string): FamilyDoctorV5Report {
  return {
    timeRange,
    sign: { package: 3, team: 100, resident: 50000, priority: 80, signRate: 60, renewalRate: 85 },
    healthMgmt: { record: 100, chronic: 70, annualExam: 80, education: 90, followup: 85 },
    homeService: { homebed: 500, homeVisit: 10000, nursing: 2000, rehab: 1000, hospice: 100 },
    package: { basic: 90, value: 10, insurance: 5, publicHealth: 100, personalized: 20 },
    team: { gp: 300, specialty: 50, nurse: 200, publicHealth: 100, pharmacist: 30, it: 20 },
    kpi: { sign: 60, healthIndicator: 75, satisfaction: 90, cost: 20, firstVisit: 70, referral: 30 },
    residentApp: { miniApp: 80000, healthData: 70, doctorConsult: 5000, appointment: 3000, followup: 8000 },
    outcome: { chronicControl: 70, firstVisit: 70, cost: 20, satisfaction: 90, literacy: 65 },
    suggestions: ["提升签约率", "加强上门服务"],
  };
}
