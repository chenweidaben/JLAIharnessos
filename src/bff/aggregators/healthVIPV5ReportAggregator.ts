/**
 * 健澜科技 jlmedaios - 健康管理 VIP 服务 V5 纯函数（M274-D）
 *
 * assignVIPDoctorV5 / planVIPHealthV5 / buildHealthVIPV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 私人医生分配 V5（纯函数）。
 *
 * @param member 会员等级
 * @returns 医生分配
 */
export function assignVIPDoctorV5(member: "gold" | "platinum" | "diamond"): { doctor: string; responseTime: number } {
  let doctor = "普通全科医生";
  let responseTime = 24;
  if (member === "diamond") {
    doctor = "首席专家";
    responseTime = 1;
  } else if (member === "platinum") {
    doctor = "副主任医师";
    responseTime = 4;
  } else if (member === "gold") {
    doctor = "主治医师";
    responseTime = 8;
  }
  return { doctor, responseTime };
}

/**
 * 年度健康计划 V5（纯函数）。
 *
 * @param member 会员
 * @param goals 目标数
 * @returns 健康计划
 */
export function planVIPHealthV5(member: string, goals: number): { member: string; plan: string; sessions: number } {
  let plan = "基础年度体检+1次咨询";
  let sessions = 4;
  if (goals >= 5) {
    plan = "深度评估+月度随访+营养运动方案";
    sessions = 12;
  } else if (goals >= 3) {
    plan = "年度体检+季度随访";
    sessions = 6;
  }
  return { member, plan, sessions };
}

/** 健康管理 VIP 服务 V5 报告输出 */
export interface HealthVIPV5Report {
  timeRange: string;
  vipMember: { tier: number; benefits: number; annualFee: number; familyDoctor: number; greenChannel: number; exclusiveService: number };
  healthRecord: { record360: number; checkup: number; visit: number; chronicDisease: number; medication: number; test: number; trend: number };
  privateDoctor: { signing: number; consult: number; homeVisit: number; referral: number; coordination: number; annualPlan: number };
  greenMedical: { booking: number; expert: number; bed: number; test: number; urgent: number; accompanying: number; carService: number };
  chronicDisease: { bloodPressure: number; bloodSugar: number; medication: number; indicator: number; followup: number; abnormalAlert: number; familySync: number };
  healthPromotion: { annualAssessment: number; goal: number; intervention: number; nutrition: number; exercise: number; sleep: number; psychology: number };
  familyHealth: { familyAccount: number; members: number; children: number; elderly: number; spouse: number; healthPlan: number };
  metrics: { renewalRate: number; healthIndicatorImprovement: number; nps: number; complaint: number; healthOutcome: number };
  suggestions: string[];
}

/**
 * 构建健康管理 VIP 服务 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildHealthVIPV5Report(timeRange: string): HealthVIPV5Report {
  return {
    timeRange,
    vipMember: { tier: 4, benefits: 1, annualFee: 1, familyDoctor: 500, greenChannel: 300, exclusiveService: 1 },
    healthRecord: { record360: 1, checkup: 500, visit: 2000, chronicDisease: 300, medication: 1, test: 1000, trend: 1 },
    privateDoctor: { signing: 500, consult: 1500, homeVisit: 50, referral: 100, coordination: 200, annualPlan: 500 },
    greenMedical: { booking: 500, expert: 300, bed: 50, test: 400, urgent: 30, accompanying: 200, carService: 100 },
    chronicDisease: { bloodPressure: 200, bloodSugar: 150, medication: 1, indicator: 1, followup: 300, abnormalAlert: 50, familySync: 1 },
    healthPromotion: { annualAssessment: 500, goal: 1, intervention: 300, nutrition: 100, exercise: 100, sleep: 80, psychology: 50 },
    familyHealth: { familyAccount: 200, members: 600, children: 100, elderly: 150, spouse: 200, healthPlan: 1 },
    metrics: { renewalRate: 85, healthIndicatorImprovement: 70, nps: 60, complaint: 2, healthOutcome: 1 },
    suggestions: [
      "提升续约率，扩大VIP家庭账户",
      "加强慢病指标改善追踪",
      "优化绿通响应速度",
    ],
  };
}
