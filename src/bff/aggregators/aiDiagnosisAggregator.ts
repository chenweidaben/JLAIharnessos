/**
 * 健澜科技 jlmedaios - AI 影像与病理诊断纯函数（M203-D）
 *
 * buildAIDiagnosisReport / detectLungNodule / classifyPathologyGrade
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 影像特征 */
export interface ImageFeatures {
  density: number;
  sizeMm: number;
  irregularBorder: boolean;
  calcification: boolean;
}

/**
 * 检测肺结节（纯函数）。
 *
 * @param features 影像特征
 * @returns 检测结果
 */
export function detectLungNodule(features: ImageFeatures): { noduleDetected: boolean; malignancyRisk: number; recommendation: string } {
  let malignancyRisk = 0;
  if (features.sizeMm > 8) malignancyRisk += 0.3;
  if (features.irregularBorder) malignancyRisk += 0.3;
  if (features.density > 0.5) malignancyRisk += 0.2;
  if (features.calcification) malignancyRisk -= 0.2;

  const noduleDetected = features.sizeMm > 3;
  let recommendation = '年度复查';
  if (malignancyRisk >= 0.5) recommendation = '建议穿刺活检';
  else if (malignancyRisk >= 0.2) recommendation = '3 个月复查 CT';

  return { noduleDetected, malignancyRisk: Math.min(1, malignancyRisk), recommendation };
}

/** 细胞特征 */
export interface CellularFeatures {
  nuclearPleomorphism: boolean;
  mitoticCount: number;
  stromalInvasion: boolean;
}

/**
 * 病理分级（纯函数）。
 *
 * @param features 细胞特征
 * @returns 病理分级
 */
export function classifyPathologyGrade(features: CellularFeatures): { grade: string; tnms: string } {
  let score = 0;
  if (features.nuclearPleomorphism) score += 1;
  if (features.mitoticCount >= 5) score += 1;
  if (features.stromalInvasion) score += 2;

  let grade = 'I 级（高分化）';
  if (score >= 3) grade = 'III 级（低分化）';
  else if (score >= 1) grade = 'II 级（中分化）';

  const tnms = features.stromalInvasion ? 'T2' : 'T1';
  return { grade, tnms };
}

/** AI 诊断报告输出 */
export interface AIDiagnosisReport {
  timeRange: string;
  imaging: { lungNodule: number; fracture: number; ich: number; fundus: number; breast: number };
  pathology: { cancerDetection: number; lymphNode: number; tnmsStaging: number; molecular: number };
  reporting: { autoStructured: number; autoDescription: number };
  performance: { sensitivity: number; specificity: number; auc: number; timeSavedMin: number };
  audit: { reviewed: number; falsePositive: number; falseNegative: number };
  iteration: { retrainedModels: number; updatedVersions: number };
  suggestions: string[];
}

/**
 * 构建 AI 诊断报告。
 *
 * @param timeRange 时间范围
 * @returns AI 诊断报告
 */
export function buildAIDiagnosisReport(timeRange: string): AIDiagnosisReport {
  return {
    timeRange,
    imaging: { lungNodule: 5000, fracture: 2000, ich: 500, fundus: 1000, breast: 800 },
    pathology: { cancerDetection: 3000, lymphNode: 1500, tnmsStaging: 1200, molecular: 400 },
    reporting: { autoStructured: 8000, autoDescription: 6000 },
    performance: { sensitivity: 0.92, specificity: 0.88, auc: 0.95, timeSavedMin: 5 },
    audit: { reviewed: 8000, falsePositive: 200, falseNegative: 50 },
    iteration: { retrainedModels: 5, updatedVersions: 10 },
    suggestions: ['降低假阴性率', '扩展 AI 病理病种覆盖'],
  };
}
