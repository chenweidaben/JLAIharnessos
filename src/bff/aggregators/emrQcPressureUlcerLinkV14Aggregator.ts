/**
 * 健澜科技 jlmedaios - 质控-压疮风险评估联动 V14 聚合器（M517-C）
 *
 * 纯函数：构建质控-压疮评估联动数据 + 检查压疮评估一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-压疮评估联动数据 */
export interface PressureUlcerLinkV14 {
  recordId: string;
  bradenScore: number;
  riskLevel: string;
}

/** 压疮评估一致性检查入参 */
export interface PressureUlcerConsistencyRecordV14 {
  hasInitial: boolean;
  hasReassessment: boolean;
  hasPrevention: boolean;
}

/** 压疮评估一致性检查结果 */
export interface PressureUlcerConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 压疮评估联动报告 */
export interface PressureUlcerLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-压疮评估联动数据。
 *
 * @param recordId 病历记录ID
 * @param bradenScore Braden评分
 * @param riskLevel 风险等级
 * @returns 联动数据
 */
export function buildPressureUlcerLink(recordId: string, bradenScore: number, riskLevel: string): PressureUlcerLinkV14 {
  return { recordId, bradenScore, riskLevel };
}

/**
 * 检查压疮评估一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 压疮评估一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkPressureUlcerConsistency(record: PressureUlcerConsistencyRecordV14): PressureUlcerConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasInitial) {
    defects.push("缺初始压疮风险评估记录");
  }
  if (!record.hasReassessment) {
    defects.push("缺复评记录");
  }
  if (!record.hasPrevention) {
    defects.push("缺预防措施记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建压疮评估联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildPressureUlcerLinkReport(result: PressureUlcerConsistencyResultV14): PressureUlcerLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
