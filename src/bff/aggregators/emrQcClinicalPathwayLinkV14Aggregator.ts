/**
 * 健澜科技 jlmedaios - 质控-临床路径联动 V14 聚合器（M514-C）
 *
 * 纯函数：构建质控-临床路径联动数据 + 检查临床路径一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-临床路径联动数据 */
export interface ClinicalPathwayLinkV14 {
  recordId: string;
  pathwayName: string;
  phase: string;
}

/** 临床路径一致性检查入参 */
export interface PathwayConsistencyRecordV14 {
  hasPathwayEntry: boolean;
  hasPhaseUpdate: boolean;
  hasExitNote: boolean;
}

/** 临床路径一致性检查结果 */
export interface PathwayConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 临床路径联动报告 */
export interface PathwayLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-临床路径联动数据。
 *
 * @param recordId 病历记录ID
 * @param pathwayName 路径名
 * @param phase 阶段
 * @returns 联动数据
 */
export function buildClinicalPathwayLink(recordId: string, pathwayName: string, phase: string): ClinicalPathwayLinkV14 {
  return { recordId, pathwayName, phase };
}

/**
 * 检查临床路径一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 临床路径一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkPathwayConsistency(record: PathwayConsistencyRecordV14): PathwayConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasPathwayEntry) {
    defects.push("缺路径进入记录");
  }
  if (!record.hasPhaseUpdate) {
    defects.push("缺阶段更新");
  }
  if (!record.hasExitNote) {
    defects.push("缺退出记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建临床路径联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildPathwayLinkReport(result: PathwayConsistencyResultV14): PathwayLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
