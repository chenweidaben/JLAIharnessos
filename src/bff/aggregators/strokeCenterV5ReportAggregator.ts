/**
 * 健澜科技 jlmedaios - 卒中中心智能化 V5 纯函数（M263-B）
 *
 * buildStrokeCenterV5Report / scoreNIHSSV5 / trackDNTV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * NIHSS 评分 V5（纯函数）。
 *
 * @param exam 检查
 * @returns 评分
 */
export function scoreNIHSSV5(exam: { consciousness: number; gaze: number; visual: number; motor: number; language: number }): { total: number; severity: string; level: string } {
  const total = exam.consciousness + exam.gaze + exam.visual + exam.motor + exam.language;
  let severity = "轻度";
  let level = "普通病房";
  if (total >= 21) {
    severity = "重度";
    level = "卒中监护";
  } else if (total >= 9) {
    severity = "中度";
    level = "卒中单元";
  }
  return { total, severity, level };
}

/**
 * 追踪 DNT 时间 V5（纯函数）。
 *
 * @param patient 患者
 * @param timestamps 时间戳
 * @returns 追踪
 */
export function trackDNTV5(patient: { id: string }, timestamps: { door: number; needle: number; ct: number }): { dnt: number; target: number; compliant: boolean } {
  const dnt = timestamps.needle - timestamps.door;
  const target = 60;
  const compliant = dnt <= target;
  return { dnt, target, compliant };
}

/** 卒中中心智能化 V5 报告输出 */
export interface StrokeCenterV5Report {
  timeRange: string;
  triage: { fast: number; befast: number; greenChannel: number; nihss: number };
  thrombolysis: { dnt: number; indication: number; contraindication: number; consent: number; monitoring: number };
  thrombectomy: { lvo: number; bridging: number; mechanical: number; recanalization: number; perioperative: number };
  differential: { ich: number; tia: number; hypoglycemia: number; postictal: number; migraine: number; mass: number };
  strokeUnit: { bp: number; glucose: number; swallow: number; earlyRehab: number; dvtPrevention: number };
  secondary: { antiplatelet: number; statin: number; antiHtn: number; antiDiabetic: number; lifestyle: number; followup: number; recurrence: number };
  quality: { database: number; qc: number; certification: number; continuous: number; regional: number };
  ai: { ncct: number; cta: number; ctp: number; aspects: number; lvoAuto: number };
  metrics: { dnt: number; recanalization: number; mortality: number; disability: number; recurrence: number };
  suggestions: string[];
}

/**
 * 构建卒中中心智能化 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 卒中中心智能化 V5 报告
 */
export function buildStrokeCenterV5Report(timeRange: string): StrokeCenterV5Report {
  return {
    timeRange,
    triage: { fast: 95, befast: 90, greenChannel: 100, nihss: 98 },
    thrombolysis: { dnt: 45, indication: 95, contraindication: 100, consent: 98, monitoring: 100 },
    thrombectomy: { lvo: 300, bridging: 80, mechanical: 250, recanalization: 85, perioperative: 90 },
    differential: { ich: 200, tia: 300, hypoglycemia: 50, postictal: 20, migraine: 80, mass: 30 },
    strokeUnit: { bp: 95, glucose: 90, swallow: 85, earlyRehab: 80, dvtPrevention: 95 },
    secondary: { antiplatelet: 95, statin: 90, antiHtn: 85, antiDiabetic: 80, lifestyle: 70, followup: 85, recurrence: 5 },
    quality: { database: 100, qc: 90, certification: 1, continuous: 95, regional: 80 },
    ai: { ncct: 92, cta: 90, ctp: 85, aspects: 88, lvoAuto: 90 },
    metrics: { dnt: 45, recanalization: 85, mortality: 8, disability: 20, recurrence: 5 },
    suggestions: ["缩短 DNT 时间", "提升取栓率"],
  };
}
