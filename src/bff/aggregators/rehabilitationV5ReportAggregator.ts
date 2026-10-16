/**
 * 健澜科技 jlmedaios - 康复医学与日间康复 V5 纯函数（M272-B）
 *
 * scoreBarthelV5 / prescribeRehabV5 / buildRehabilitationV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * Barthel指数评分 V5（纯函数）。
 *
 * @param adl ADL各项得分
 * @returns Barthel总分与等级
 */
export function scoreBarthelV5(adl: { feeding: number; bathing: number; dressing: number; toileting: number; transfer: number; walking: number }): { total: number; level: string } {
  const total = adl.feeding + adl.bathing + adl.dressing + adl.toileting + adl.transfer + adl.walking;
  let level = "重度依赖";
  if (total >= 90) {
    level = "独立";
  } else if (total >= 60) {
    level = "轻度依赖";
  } else if (total >= 40) {
    level = "中度依赖";
  }
  return { total, level };
}

/**
 * 康复处方 V5（纯函数）。
 *
 * @param patient 患者
 * @param phase 康复阶段
 * @returns 处方
 */
export function prescribeRehabV5(patient: string, phase: "early" | "recovery" | "sequelae"): { patient: string; program: string; frequency: string } {
  let program = "床边PT";
  let frequency = "每日1次";
  if (phase === "recovery") {
    program = "PT+OT+ST综合";
    frequency = "每日2次";
  } else if (phase === "sequelae") {
    program = "社区/家庭康复指导";
    frequency = "每周3次";
  }
  return { patient, program, frequency };
}

/** 康复医学与日间康复 V5 报告输出 */
export interface RehabilitationV5Report {
  timeRange: string;
  assessment: { brunnstrom: number; fuglMeyer: number; barthel: number; fim: number; balance: number; gait: number; adl: number };
  therapy: { pt: number; ot: number; st: number; physicalAgent: number; occupational: number; speech: number; swallowing: number; traditional: number };
  stroke: { earlyBedside: number; recovery: number; sequelae: number; wheelchair: number; orthosis: number; homeModification: number };
  orthopedic: { jointReplacement: number; fracture: number; sportsInjury: number; postopEarly: number; returnToWork: number };
  cardiopulmonary: { mi: number; hf: number; copd: number; exercisePrescription: number; sixMinWalk: number; readmission: number };
  dayRehab: { dayward: number; outpatient: number; home: number; roundtrip: number; efficiency: number; cost: number };
  engineering: { orthosis: number; prosthesis: number; wheelchair: number; environmentalModification: number; teleRehab: number };
  metrics: { adlImprovement: number; returnToWork: number; readmission: number; satisfaction: number; rehabDuration: number };
  suggestions: string[];
}

/**
 * 构建康复医学与日间康复 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildRehabilitationV5Report(timeRange: string): RehabilitationV5Report {
  return {
    timeRange,
    assessment: { brunnstrom: 200, fuglMeyer: 180, barthel: 200, fim: 150, balance: 180, gait: 160, adl: 200 },
    therapy: { pt: 500, ot: 300, st: 100, physicalAgent: 200, occupational: 280, speech: 90, swallowing: 60, traditional: 150 },
    stroke: { earlyBedside: 100, recovery: 150, sequelae: 50, wheelchair: 30, orthosis: 40, homeModification: 20 },
    orthopedic: { jointReplacement: 80, fracture: 100, sportsInjury: 60, postopEarly: 120, returnToWork: 50 },
    cardiopulmonary: { mi: 40, hf: 30, copd: 50, exercisePrescription: 120, sixMinWalk: 100, readmission: 5 },
    dayRehab: { dayward: 80, outpatient: 200, home: 100, roundtrip: 1, efficiency: 1, cost: 1 },
    engineering: { orthosis: 40, prosthesis: 10, wheelchair: 30, environmentalModification: 20, teleRehab: 50 },
    metrics: { adlImprovement: 35, returnToWork: 45, readmission: 5, satisfaction: 88, rehabDuration: 21 },
    suggestions: [
      "加强卒中早期床边康复",
      "推进日间康复，降低成本",
      "普及远程康复，提升依从性",
    ],
  };
}
