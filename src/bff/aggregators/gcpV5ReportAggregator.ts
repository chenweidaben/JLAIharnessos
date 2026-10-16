/**
 * 健澜科技 jlmedaios - 药物临床试验 GCP V5 纯函数（M269-B）
 *
 * buildGCPV5Report / screenSubjectV5 / reportSAEV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 受试者筛选 V5（纯函数）。
 *
 * @param criteria 入选标准
 * @param subject 受试者
 * @returns 筛选结果
 */
export function screenSubjectV5(criteria: { ageMin: number; ageMax: number; include: string[]; exclude: string[] }, subject: { age: number; conditions: string[] }): { eligible: boolean; reason: string } {
  if (subject.age < criteria.ageMin || subject.age > criteria.ageMax) {
    return { eligible: false, reason: "年龄不符合" };
  }
  for (const ex of criteria.exclude) {
    if (subject.conditions.includes(ex)) {
      return { eligible: false, reason: `排除标准: ${ex}` };
    }
  }
  return { eligible: true, reason: "符合入选标准" };
}

/**
 * SAE报告 V5（纯函数）。
 *
 * @param event 事件
 * @param timelines 时限
 * @returns 报告
 */
export function reportSAEV5(event: { severity: string; related: boolean }, timelines: { initial: number; followup: number }): { reportable: boolean; deadline: number; daysOverdue: number } {
  let reportable = false;
  let deadline = 0;
  if (event.severity === "死亡" || event.related) {
    reportable = true;
    deadline = timelines.initial;
  } else if (event.severity === "严重") {
    reportable = true;
    deadline = timelines.followup;
  }
  const daysOverdue = Math.max(0, 0 - deadline);
  return { reportable, deadline, daysOverdue };
}

/** 药物临床试验 GCP V5 报告输出 */
export interface GCPV5Report {
  timeRange: string;
  projects: { phase1: number; phase2: number; phase3: number; be: number; iit: number; initiation: number; contract: number; kickoff: number };
  subjects: { screen: number; consent: number; enrollment: number; randomization: number; withdrawal: number; followup: number; adherence: number };
  edc: { edc: number; ecrf: number; sourceVerif: number; query: number; lock: number; auditTrail: number };
  safety: { ae: number; sae: number; adverse: number; rapidReport: number; monitoring: number; dsmb: number };
  drug: { trialDrug: number; control: number; receipt: number; storage: number; dispense: number; return: number; counting: number };
  monitoring: { cra: number; sdv: number; audit: number; deviation: number; remediation: number; closeCenter: number };
  ethics: { review: number; consent: number; insurance: number; conflict: number; gcp: number };
  metrics: { activeProject: number; enrollmentRate: number; queryRate: number; saeTimeliness: number; output: number };
  suggestions: string[];
}

/**
 * 构建药物临床试验 GCP V5 报告。
 *
 * @param timeRange 时间范围
 * @returns GCP V5 报告
 */
export function buildGCPV5Report(timeRange: string): GCPV5Report {
  return {
    timeRange,
    projects: { phase1: 5, phase2: 8, phase3: 10, be: 15, iit: 20, initiation: 90, contract: 85, kickoff: 95 },
    subjects: { screen: 500, consent: 350, enrollment: 300, randomization: 280, withdrawal: 20, followup: 250, adherence: 90 },
    edc: { edc: 95, ecrf: 90, sourceVerif: 85, query: 15, lock: 80, auditTrail: 100 },
    safety: { ae: 120, sae: 15, adverse: 85, rapidReport: 98, monitoring: 90, dsmb: 80 },
    drug: { trialDrug: 95, control: 90, receipt: 85, storage: 95, dispense: 90, return: 85, counting: 90 },
    monitoring: { cra: 90, sdv: 85, audit: 80, deviation: 10, remediation: 95, closeCenter: 80 },
    ethics: { review: 95, consent: 98, insurance: 90, conflict: 85, gcp: 92 },
    metrics: { activeProject: 25, enrollmentRate: 70, queryRate: 15, saeTimeliness: 98, output: 30 },
    suggestions: ["降低数据质疑率", "加快入组速度"],
  };
}
