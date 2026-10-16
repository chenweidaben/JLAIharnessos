/**
 * 健澜科技 jlmedaios - 互联互通标准化成熟度 V5 纯函数（M267-C）
 *
 * buildInteropV5Report / assessInteropLevelV5 / mapVocabularyV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 评估互联互通成熟度 V5（纯函数）。
 *
 * @param capabilities 能力
 * @returns 成熟度
 */
export function assessInteropLevelV5(capabilities: { standardization: number; platform: number; dataSharing: number; application: number; security: number }): { level: string; label: string; score: number } {
  const avg = (capabilities.standardization + capabilities.platform + capabilities.dataSharing + capabilities.application + capabilities.security) / 5;
  let level = "四级一等";
  let label = "起步阶段";
  if (avg >= 90) {
    level = "七级";
    label = "示范级";
  } else if (avg >= 80) {
    level = "六级";
    label = "卓越级";
  } else if (avg >= 70) {
    level = "五级乙等";
    label = "高级";
  } else if (avg >= 60) {
    level = "五级甲等";
    label = "中级";
  } else if (avg >= 50) {
    level = "四级甲等";
    label = "基础级";
  }
  return { level, label, score: Math.round(avg) };
}

/**
 * 术语映射 V5（纯函数）。
 *
 * @param local 院内术语
 * @param standard 标准术语
 * @returns 映射
 */
export function mapVocabularyV5(local: { code: string; name: string }, standard: { icd: string; loinc: string; snomed: string }): { mapped: boolean; target: string; confidence: number } {
  let mapped = false;
  let target = "未映射";
  let confidence = 0;
  if (local.name.includes("肺炎") || local.name.includes("pneumonia")) {
    mapped = true;
    target = `ICD: ${standard.icd}`;
    confidence = 95;
  } else if (local.name.includes("血压") || local.name.includes("BP")) {
    mapped = true;
    target = `LOINC: ${standard.loinc}`;
    confidence = 90;
  } else if (local.name.length > 2) {
    mapped = true;
    target = `SNOMED: ${standard.snomed}`;
    confidence = 75;
  }
  return { mapped, target, confidence };
}

/** 互联互通标准化成熟度 V5 报告输出 */
export interface InteropV5Report {
  timeRange: string;
  framework: { level: string; label: string; dataResource: number; standardization: number };
  standardization: { dataset: number; sharedDoc: number; vocabulary: number; icd: number; loinc: number; snomed: number; mapping: number };
  platform: { esb: number; cdr: number; empi: number; gateway: number; fhir: number; hl7: number; api: number };
  dataSharing: { crossSystem: number; regional: number; alliance: number; higher: number; report: number };
  application: { ehr: number; resultReciprocal: number; referral: number; telemedicine: number };
  security: { equalProtection: number; desensitization: number; audit: number; authorization: number; privacy: number };
  prep: { selfAssessment: number; remediation: number; material: number; mock: number; expert: number; predict: number };
  reciprocal: { lab: number; imaging: number; report: number; costSaving: number; repeatedDown: number };
  metrics: { currentLevel: string; targetLevel: string; readiness: number; mappingRate: number; sharingRate: number };
  suggestions: string[];
}

/**
 * 构建互联互通标准化成熟度 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 互联互通标准化成熟度 V5 报告
 */
export function buildInteropV5Report(timeRange: string): InteropV5Report {
  return {
    timeRange,
    framework: { level: "四级甲等", label: "基础级", dataResource: 70, standardization: 65 },
    standardization: { dataset: 80, sharedDoc: 75, vocabulary: 70, icd: 85, loinc: 60, snomed: 55, mapping: 70 },
    platform: { esb: 85, cdr: 80, empi: 90, gateway: 75, fhir: 50, hl7: 80, api: 60 },
    dataSharing: { crossSystem: 85, regional: 60, alliance: 50, higher: 40, report: 70 },
    application: { ehr: 70, resultReciprocal: 55, referral: 60, telemedicine: 65 },
    security: { equalProtection: 90, desensitization: 85, audit: 95, authorization: 80, privacy: 85 },
    prep: { selfAssessment: 75, remediation: 60, material: 70, mock: 50, expert: 40, predict: 65 },
    reciprocal: { lab: 60, imaging: 55, report: 65, costSaving: 40, repeatedDown: 30 },
    metrics: { currentLevel: "四级甲等", targetLevel: "五级乙等", readiness: 65, mappingRate: 70, sharingRate: 60 },
    suggestions: ["提升术语映射率", "加强区域数据共享"],
  };
}
