/**
 * 健澜科技 jlmedaios - 皮肤与感染性疾病 V5 纯函数（M266-C）
 *
 * buildDermInfectiousV5Report / classifyRashV5 / assessInfectionSeverityV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 皮疹分类 V5（纯函数）。
 *
 * @param lesion 皮损
 * @param duration 病程
 * @param fever 发热
 * @returns 皮疹
 */
export function classifyRashV5(lesion: { type: string; distribution: string }, duration: { value: number }, fever: { present: boolean }): { category: string; urgency: string; workup: string } {
  let category = "皮炎";
  let urgency = "常规";
  let workup = "临床诊断";
  if (fever.present && duration.value < 7) {
    category = "感染性皮疹";
    urgency = "紧急";
    workup = "血常规+病原学";
  }
  if (lesion.type === "水疱" && lesion.distribution === "全身") {
    category = "重症药疹";
    urgency = "危重";
    workup = "立即住院+停可疑药";
  }
  if (lesion.type === "鳞屑" && duration.value > 30) {
    category = "银屑病";
    urgency = "常规";
    workup = "皮肤镜+病理";
  }
  return { category, urgency, workup };
}

/**
 * 感染严重度评估 V5（纯函数）。
 *
 * @param vs 生命体征
 * @param labs 化验
 * @param source 感染源
 * @returns 严重度
 */
export function assessInfectionSeverityV5(vs: { temp: number; bp: number; hr: number; rr: number }, labs: { wbc: number; lactate: number }, source: { type: string }): { severity: string; sepsis: boolean; treatment: string } {
  let severity = "轻度";
  let sepsis = false;
  let treatment = "口服抗感染";
  if (labs.lactate > 2 || vs.bp < 90 || vs.rr > 20) {
    severity = "脓毒症";
    sepsis = true;
    treatment = "静脉抗感染+1h bundle";
  }
  if (labs.lactate > 4 || vs.bp < 70) {
    severity = "感染性休克";
    treatment = "ICU+液体复苏+血管活性药";
  }
  if (labs.wbc > 12 || labs.wbc < 4) {
    if (severity === "轻度") severity = "中度";
  }
  return { severity, sepsis, treatment };
}

/** 皮肤与感染性疾病 V5 报告输出 */
export interface DermInfectiousV5Report {
  timeRange: string;
  dermatology: { eczema: number; dermatitis: number; psoriasis: number; acne: number; urticaria: number; fungal: number; viral: number; skinTumor: number };
  sti: { syphilis: number; gonorrhea: number; chlamydia: number; hiv: number; hpv: number; hsv: number; contactTracing: number };
  infectious: { feverWorkup: number; bacterial: number; viral: number; fungal: number; parasitic: number; antimicrobial: number };
  hai: { mdro: number; occupationalExposure: number; handHygiene: number; envDisinfection: number; outbreak: number };
  vaccine: { flu: number; pneumococcal: number; hpvVaccine: number; hbv: number; pep: number; travelMedicine: number };
  procedure: { biopsy: number; cryo: number; laser: number; surgery: number; pathology: number; cosmetic: number };
  drugEruption: { drugEruption: number; sjs: number; ten: number; patchTest: number };
  metrics: { cure: number; recurrence: number; resistance: number; occupational: number; outbreakEvent: number };
  suggestions: string[];
}

/**
 * 构建皮肤与感染性疾病 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 皮肤与感染性疾病 V5 报告
 */
export function buildDermInfectiousV5Report(timeRange: string): DermInfectiousV5Report {
  return {
    timeRange,
    dermatology: { eczema: 1000, dermatitis: 800, psoriasis: 300, acne: 1500, urticaria: 400, fungal: 600, viral: 500, skinTumor: 100 },
    sti: { syphilis: 50, gonorrhea: 30, chlamydia: 100, hiv: 20, hpv: 2000, hsv: 80, contactTracing: 90 },
    infectious: { feverWorkup: 200, bacterial: 500, viral: 800, fungal: 100, parasitic: 50, antimicrobial: 95 },
    hai: { mdro: 100, occupationalExposure: 20, handHygiene: 95, envDisinfection: 90, outbreak: 5 },
    vaccine: { flu: 2000, pneumococcal: 800, hpvVaccine: 1000, hbv: 500, pep: 30, travelMedicine: 50 },
    procedure: { biopsy: 200, cryo: 300, laser: 400, surgery: 150, pathology: 180, cosmetic: 600 },
    drugEruption: { drugEruption: 50, sjs: 3, ten: 2, patchTest: 100 },
    metrics: { cure: 85, recurrence: 15, resistance: 10, occupational: 0, outbreakEvent: 0 },
    suggestions: ["加强抗生素管理", "提升手卫生依从性"],
  };
}
