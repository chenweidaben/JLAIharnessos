/**
 * 健澜科技 jlmedaios - 创伤中心智能化 V5 纯函数（M263-C）
 *
 * buildTraumaCenterV5Report / calculateISSV5 / assessTraumaTeamReadinessV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算 ISS 评分 V5（纯函数）。
 *
 * @param injuries 损伤
 * @returns ISS
 */
export function calculateISSV5(injuries: { bodyRegion: string; ais: number }[]): { iss: number; severity: string; level: string } {
  const regions: Record<string, number> = {};
  for (const injury of injuries) {
    if (!regions[injury.bodyRegion] || injury.ais > regions[injury.bodyRegion]) {
      regions[injury.bodyRegion] = injury.ais;
    }
  }
  const values = Object.values(regions).sort((a, b) => b - a).slice(0, 3);
  const iss = values.reduce((sum, v) => sum + v * v, 0);
  let severity = "轻伤";
  let level = "普通病房";
  if (iss >= 25) {
    severity = "重伤";
    level = "ICU";
  } else if (iss >= 16) {
    severity = "中等伤";
    level = "手术室";
  }
  return { iss, severity, level };
}

/**
 * 评估创伤团队就绪 V5（纯函数）。
 *
 * @param team 团队
 * @param gear 装备
 * @returns 就绪
 */
export function assessTraumaTeamReadinessV5(team: { surgeons: number; nurses: number; anesthesia: number }, gear: { traumaKit: boolean; bloodAvailable: boolean }): { ready: boolean; missing: string[]; time: number } {
  const missing: string[] = [];
  if (team.surgeons < 2) missing.push("外科医生不足");
  if (team.nurses < 2) missing.push("护士不足");
  if (team.anesthesia < 1) missing.push("麻醉医生不足");
  if (!gear.traumaKit) missing.push("创伤箱缺失");
  if (!gear.bloodAvailable) missing.push("血制品不足");
  const ready = missing.length === 0;
  const time = ready ? 5 : 15;
  return { ready, missing, time };
}

/** 创伤中心智能化 V5 报告输出 */
export interface TraumaCenterV5Report {
  timeRange: string;
  activation: { prealert: number; triage: number; multipleTrauma: number; teamAssembly: number };
  scoring: { iss: number; rts: number; triss: number; crash: number; physiology: number; mechanism: number };
  damageControl: { resuscitation: number; hemostasis: number; warming: number; ventilation: number; surgeryOrder: number };
  multiInjury: { head: number; chest: number; abdomen: number; pelvis: number; extremity: number; vascular: number; neurosurgery: number; orthopedics: number };
  icu: { fluidBalance: number; coagulation: number; hypothermia: number; acidosis: number; mof: number };
  recovery: { earlyRehab: number; functionalAssess: number; psychology: number; ptss: number; returnSociety: number };
  quality: { database: number; qc: number; certification: number; injuryPrevention: number; regional: number };
  ai: { scoring: number; prediction: number; ctRapid: number; hemorrhage: number; resource: number };
  metrics: { mortality: number; laparotomy: number; icuLOS: number; complication: number };
  suggestions: string[];
}

/**
 * 构建创伤中心智能化 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 创伤中心智能化 V5 报告
 */
export function buildTraumaCenterV5Report(timeRange: string): TraumaCenterV5Report {
  return {
    timeRange,
    activation: { prealert: 90, triage: 95, multipleTrauma: 200, teamAssembly: 98 },
    scoring: { iss: 20, rts: 7, triss: 0.9, crash: 500, physiology: 90, mechanism: 85 },
    damageControl: { resuscitation: 95, hemostasis: 90, warming: 85, ventilation: 98, surgeryOrder: 92 },
    multiInjury: { head: 50, chest: 80, abdomen: 60, pelvis: 40, extremity: 100, vascular: 20, neurosurgery: 30, orthopedics: 90 },
    icu: { fluidBalance: 90, coagulation: 85, hypothermia: 80, acidosis: 85, mof: 5 },
    recovery: { earlyRehab: 80, functionalAssess: 75, psychology: 70, ptss: 10, returnSociety: 85 },
    quality: { database: 100, qc: 90, certification: 1, injuryPrevention: 70, regional: 80 },
    ai: { scoring: 88, prediction: 85, ctRapid: 92, hemorrhage: 88, resource: 80 },
    metrics: { mortality: 10, laparotomy: 30, icuLOS: 7, complication: 15 },
    suggestions: ["提升团队集合速度", "加强损伤控制复苏"],
  };
}
