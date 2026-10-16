/**
 * 健澜科技 jlmedaios - 医联体分级诊疗智能化 V5 纯函数（M262-B）
 *
 * buildMedicalAllianceV5Report / recommendReferralV5 / assessGradingV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 推荐转诊 V5（纯函数）。
 *
 * @param patient 患者
 * @param level 层级
 * @returns 转诊
 */
export function recommendReferralV5(patient: { condition: string; severity: string }, level: { current: string; target: string }): { direction: string; reason: string; greenChannel: boolean } {
  let direction = "维持基层";
  let reason = "基层可处理";
  let greenChannel = false;
  if (patient.severity === "危重" && level.current === "基层") {
    direction = "上转三级";
    reason = "危重需高级医院";
    greenChannel = true;
  } else if (patient.severity === "稳定" && level.current === "三级") {
    direction = "下转基层";
    reason = "稳定期可康复随访";
  }
  return { direction, reason, greenChannel };
}

/**
 * 评估分级 V5（纯函数）。
 *
 * @param patient 患者
 * @param condition 病情
 * @returns 分级
 */
export function assessGradingV5(patient: { age: number; chronic: number }, condition: { acute: boolean; complexity: string }): { level: string; recommended: string } {
  let level = "一级";
  let recommended = "基层首诊";
  if (condition.acute || condition.complexity === "复杂") {
    level = "三级";
    recommended = "三级医院";
  } else if (patient.chronic >= 2 && patient.age >= 65) {
    level = "二级";
    recommended = "二级医院";
  }
  return { level, recommended };
}

/** 医联体分级诊疗智能化 V5 报告输出 */
export interface MedicalAllianceV5Report {
  timeRange: string;
  organization: { cityGroup: number; countyConsortium: number; specialtyNetwork: number; telemedicine: number };
  referral: { up: number; down: number; standard: number; greenChannel: number; bedReserve: number; followup: number };
  expert: { clinic: number; surgery: number; teaching: number; rounds: number; training: number; remoteConsult: number };
  grassroots: { workstation: number; teleTeaching: number; rxExtension: number; examRecognition: number };
  shared: { imaging: number; lab: number; pathology: number; ecg: number; sterilization: number; logistics: number };
  kpi: { grassVisitRate: number; downRate: number; upRate: number; countyRate: number };
  ai: { triage: number; downIndication: number; upIndication: number; decision: number };
  metrics: { member: number; quality: number; efficiency: number; patient: number; resource: number; subsidy: number };
  suggestions: string[];
}

/**
 * 构建医联体分级诊疗智能化 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 医联体分级诊疗智能化 V5 报告
 */
export function buildMedicalAllianceV5Report(timeRange: string): MedicalAllianceV5Report {
  return {
    timeRange,
    organization: { cityGroup: 1, countyConsortium: 1, specialtyNetwork: 10, telemedicine: 1 },
    referral: { up: 5000, down: 3000, standard: 100, greenChannel: 90, bedReserve: 85, followup: 80 },
    expert: { clinic: 500, surgery: 100, teaching: 200, rounds: 300, training: 1000, remoteConsult: 500 },
    grassroots: { workstation: 50, teleTeaching: 200, rxExtension: 1000, examRecognition: 90 },
    shared: { imaging: 1, lab: 1, pathology: 1, ecg: 1, sterilization: 1, logistics: 1 },
    kpi: { grassVisitRate: 65, downRate: 60, upRate: 40, countyRate: 90 },
    ai: { triage: 90, downIndication: 85, upIndication: 90, decision: 80 },
    metrics: { member: 20, quality: 85, efficiency: 80, patient: 90, resource: 75, subsidy: 100 },
    suggestions: ["提升下转率", "加强基层赋能"],
  };
}
