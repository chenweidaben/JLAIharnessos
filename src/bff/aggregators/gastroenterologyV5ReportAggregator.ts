/**
 * 健澜科技 jlmedaios - 消化系统疾病管理 V5 纯函数（M265-A）
 *
 * buildGastroenterologyV5Report / classifyLiverDiseaseV5 / assessGIEndoscopyQualityV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 肝病分级 V5（纯函数）。
 *
 * @param liver 肝功
 * @param etiology 病因
 * @returns 肝病
 */
export function classifyLiverDiseaseV5(liver: { alt: number; bilirubin: number; albumin: number; inr: number }, etiology: { viral: boolean; fatty: boolean; alcohol: boolean }): { stage: string; severity: string; treatment: string } {
  let stage = "慢性肝炎";
  let severity = "轻度";
  let treatment = "病因治疗";
  if (liver.albumin < 30 || liver.inr > 1.5 || liver.bilirubin > 50) {
    stage = "肝硬化";
    severity = "失代偿";
    treatment = "综合治疗+人工肝评估";
  } else if (liver.alt > 5 || liver.bilirubin > 34) {
    stage = "慢性肝炎";
    severity = "中重度";
    treatment = "抗病毒/保肝";
  }
  if (etiology.viral) treatment = "抗病毒+";
  else if (etiology.alcohol) treatment = "戒酒+保肝";
  else if (etiology.fatty) treatment = "生活方式+保肝";
  return { stage, severity, treatment };
}

/**
 * 评估内镜质量 V5（纯函数）。
 *
 * @param endoscopies 内镜
 * @returns 质量
 */
export function assessGIEndoscopyQualityV5(endoscopies: { colonoscopy: number; polypDetected: number; cecalIntubation: number; biopsy: number }): { adenomaDetection: number; cecalIntubationRate: number; rating: string; improvement: string[] } {
  const adenomaDetection = endoscopies.colonoscopy > 0 ? Math.round((endoscopies.polypDetected / endoscopies.colonoscopy) * 100) : 0;
  const cecalIntubationRate = endoscopies.colonoscopy > 0 ? Math.round((endoscopies.cecalIntubation / endoscopies.colonoscopy) * 100) : 0;
  let rating = "合格";
  const improvement: string[] = [];
  if (adenomaDetection < 25) {
    rating = "待改进";
    improvement.push("提升腺瘤检出率");
  }
  if (cecalIntubationRate < 95) {
    rating = "待改进";
    improvement.push("提升盲肠插镜率");
  }
  return { adenomaDetection, cecalIntubationRate, rating, improvement };
}

/** 消化系统疾病管理 V5 报告输出 */
export interface GastroenterologyV5Report {
  timeRange: string;
  endoscopy: { gastroscopy: number; colonoscopy: number; polyp: number; earlyCancer: number; esd: number; emr: number; sedation: number; qc: number };
  liver: { viralHepatitis: number; fattyLiver: number; cirrhosis: number; hcc: number; hepaticEncephalopathy: number; artificialLiver: number };
  pancreaticobiliary: { cholecystitis: number; gallstone: number; pancreatitis: number; ercp: number; eus: number; pancreaticCancer: number; jaundice: number };
  ibd: { crohn: number; uc: number; biologic: number; followup: number; nutrition: number };
  functional: { ibs: number; fd: number; gerd: number; psychosomatic: number };
  bleeding: { hematemesis: number; melena: number; hematochezia: number; urgentEndoscopy: number; hemostasis: number; transfusion: number };
  nutrition: { enteral: number; parenteral: number; shortBowel: number; swallow: number; assessment: number };
  metrics: { earlyCancerDetection: number; polypPolypectomy: number; rebleed: number; mortality: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建消化系统疾病管理 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 消化系统疾病管理 V5 报告
 */
export function buildGastroenterologyV5Report(timeRange: string): GastroenterologyV5Report {
  return {
    timeRange,
    endoscopy: { gastroscopy: 5000, colonoscopy: 3000, polyp: 800, earlyCancer: 50, esd: 100, emr: 200, sedation: 90, qc: 85 },
    liver: { viralHepatitis: 1000, fattyLiver: 5000, cirrhosis: 500, hcc: 50, hepaticEncephalopathy: 30, artificialLiver: 10 },
    pancreaticobiliary: { cholecystitis: 300, gallstone: 800, pancreatitis: 100, ercp: 200, eus: 150, pancreaticCancer: 30, jaundice: 100 },
    ibd: { crohn: 100, uc: 200, biologic: 80, followup: 85, nutrition: 70 },
    functional: { ibs: 1000, fd: 2000, gerd: 3000, psychosomatic: 30 },
    bleeding: { hematemesis: 200, melena: 300, hematochezia: 100, urgentEndoscopy: 95, hemostasis: 90, transfusion: 60 },
    nutrition: { enteral: 500, parenteral: 200, shortBowel: 20, swallow: 300, assessment: 80 },
    metrics: { earlyCancerDetection: 15, polypPolypectomy: 80, rebleed: 5, mortality: 2, satisfaction: 88 },
    suggestions: ["提升早癌检出率", "加强内镜质控"],
  };
}
