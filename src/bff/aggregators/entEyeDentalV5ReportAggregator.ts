/**
 * 健澜科技 jlmedaios - 眼科耳鼻喉口腔 V5 纯函数（M266-D）
 *
 * buildENTEyeDentalV5Report / assessCataractV5 / screenHearingV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 白内障评估 V5（纯函数）。
 *
 * @param visual 视力
 * @param lens 晶状体
 * @returns 白内障
 */
export function assessCataractV5(visual: { va: number }, lens: { opacity: number }): { severity: string; surgery: boolean; timing: string } {
  let severity = "早期";
  let surgery = false;
  let timing = "随访";
  if (visual.va < 0.3 && lens.opacity > 3) {
    severity = "成熟期";
    surgery = true;
    timing = "建议手术";
  } else if (visual.va < 0.5 || lens.opacity > 2) {
    severity = "未成熟期";
    timing = "定期复查";
  }
  if (visual.va < 0.1) {
    timing = "尽快手术";
  }
  return { severity, surgery, timing };
}

/**
 * 听力筛查 V5（纯函数）。
 *
 * @param audiogram 听力图
 * @returns 听力
 */
export function screenHearingV5(audiogram: { ptA: number; abr: number }): { level: string; intervention: string; rehab: string } {
  let level = "正常";
  let intervention = "观察";
  let rehab = "无";
  if (audiogram.ptA >= 80 || audiogram.abr >= 90) {
    level = "重度听力损失";
    intervention = "人工耳蜗评估";
    rehab = "人工耳蜗+康复";
  } else if (audiogram.ptA >= 40) {
    level = "中度听力损失";
    intervention = "助听器";
    rehab = "言语康复";
  } else if (audiogram.ptA >= 25) {
    level = "轻度听力损失";
    intervention = "定期复查";
  }
  return { level, intervention, rehab };
}

/** 眼科耳鼻喉口腔 V5 报告输出 */
export interface ENTEyeDentalV5Report {
  timeRange: string;
  eye: { cataract: number; glaucoma: number; fundus: number; strabismus: number; amblyopia: number; ocular: number; myopiaControl: number; refraction: number };
  ent: { otitisMedia: number; sinusitis: number; tonsil: number; snoring: number; voice: number; deafness: number; vertigo: number; trachealFB: number };
  dental: { caries: number; periodontal: number; endodontic: number; oralMucosa: number; omfs: number; orthodontics: number; implant: number; pediatricOral: number };
  emergency: { eyeTrauma: number; tes: number; epistaxis: number; laryngealObstruction: number; eacFB: number };
  rehab: { hearingAid: number; cochlear: number; lowVision: number; visionAid: number; rehab: number };
  earlyDetection: { fundus: number; glaucoma: number; oralCancer: number; nasopharyngoscopy: number; early: number };
  perioperative: { local: number; sedation: number; daySurgery: number; perioperative: number; followup: number };
  metrics: { surgicalVolume: number; complication: number; visionImprovement: number; hearingImprovement: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建眼科耳鼻喉口腔 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 眼科耳鼻喉口腔 V5 报告
 */
export function buildENTEyeDentalV5Report(timeRange: string): ENTEyeDentalV5Report {
  return {
    timeRange,
    eye: { cataract: 1000, glaucoma: 300, fundus: 800, strabismus: 100, amblyopia: 50, ocular: 1500, myopiaControl: 2000, refraction: 3000 },
    ent: { otitisMedia: 500, sinusitis: 800, tonsil: 200, snoring: 300, voice: 100, deafness: 400, vertigo: 150, trachealFB: 20 },
    dental: { caries: 2000, periodontal: 1500, endodontic: 800, oralMucosa: 300, omfs: 200, orthodontics: 500, implant: 300, pediatricOral: 600 },
    emergency: { eyeTrauma: 50, tes: 10, epistaxis: 100, laryngealObstruction: 5, eacFB: 30 },
    rehab: { hearingAid: 200, cochlear: 20, lowVision: 50, visionAid: 30, rehab: 100 },
    earlyDetection: { fundus: 700, glaucoma: 250, oralCancer: 30, nasopharyngoscopy: 100, early: 150 },
    perioperative: { local: 2000, sedation: 500, daySurgery: 1500, perioperative: 95, followup: 90 },
    metrics: { surgicalVolume: 3000, complication: 2, visionImprovement: 90, hearingImprovement: 80, satisfaction: 88 },
    suggestions: ["提升白内障手术量", "加强儿童口腔预防"],
  };
}
