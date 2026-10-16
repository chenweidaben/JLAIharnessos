/**
 * 健澜科技 jlmedaios - 中医中药纯函数（M202-C）
 *
 * buildTCMReport / classifyTCMConstitution / generateTCMPrescription
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者体质数据 */
export interface TCMConstitutionInput {
  coldPreference: boolean;
  heatPreference: boolean;
  dryness: boolean;
  dampness: boolean;
  qiDeficiency: boolean;
  yangDeficiency: boolean;
}

/**
 * 中医体质分类（纯函数）。
 *
 * @param input 体质输入
 * @returns 体质类型
 */
export function classifyTCMConstitution(input: TCMConstitutionInput): { type: string; description: string } {
  if (input.yangDeficiency || input.coldPreference) return { type: '阳虚质', description: '畏寒怕冷，手足不温' };
  if (input.heatPreference) return { type: '阴虚质', description: '口燥咽干，手足心热' };
  if (input.dampness) return { type: '痰湿质', description: '体形肥胖，腹部松软' };
  if (input.qiDeficiency) return { type: '气虚质', description: '容易疲乏，气短懒言' };
  if (input.dryness) return { type: '阴虚质', description: '皮肤干燥，口鼻干燥' };
  return { type: '平和质', description: '阴阳气血调和，体态适中' };
}

/** 证候 */
export interface Syndrome {
  name: string;
  symptoms: string[];
}

/**
 * 生成中药处方（纯函数）。
 *
 * @param syndrome 证候
 * @returns 处方
 */
export function generateTCMPrescription(syndrome: Syndrome): { formula: string[]; advice: string } {
  let formula: string[] = [];
  if (syndrome.name.includes('气虚')) formula = ['黄芪 15g', '党参 12g', '白术 12g', '茯苓 12g', '甘草 6g'];
  else if (syndrome.name.includes('阴虚')) formula = ['生地 15g', '麦冬 12g', '玄参 12g', '枸杞 12g'];
  else if (syndrome.name.includes('痰湿')) formula = ['半夏 9g', '陈皮 9g', '茯苓 12g', '甘草 6g'];
  else formula = ['柴胡 9g', '黄芩 9g', '党参 12g', '半夏 9g'];

  return { formula, advice: '忌食生冷油腻，规律作息' };
}

/** 中医报告输出 */
export interface TCMReport {
  dept: string;
  timeRange: string;
  diagnosis: { consultations: number; tongueDiagnosis: number; pulseDiagnosis: number; constitutionAssess: number };
  treatment: { herbalDecoction: number; acupuncture: number; tuina: number; cupping: number };
  integrated: { combinedTreatments: number };
  preventive: { healthPreservation: number };
  quality: { herbStandardRate: number };
  suggestions: string[];
}

/**
 * 构建中医报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 中医报告
 */
export function buildTCMReport(dept: string, timeRange: string): TCMReport {
  return {
    dept,
    timeRange,
    diagnosis: { consultations: 5000, tongueDiagnosis: 5000, pulseDiagnosis: 5000, constitutionAssess: 2000 },
    treatment: { herbalDecoction: 3000, acupuncture: 1500, tuina: 800, cupping: 500 },
    integrated: { combinedTreatments: 600 },
    preventive: { healthPreservation: 1000 },
    quality: { herbStandardRate: 0.95 },
    suggestions: ['加强中药饮片质量控制', '推广治未病健康管理'],
  };
}
