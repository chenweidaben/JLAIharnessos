/**
 * 健澜科技 jlmedaios - 质控-抗菌药物联动 V14 聚合器（M514-D，M514 收官）
 *
 * 纯函数：构建质控-抗菌药物联动数据 + 检查抗菌药物一致性 + 构建联动报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控-抗菌药物联动数据 */
export interface AntibioticLinkV14 {
  recordId: string;
  antibioticName: string;
  days: number;
}

/** 抗菌药物一致性检查入参 */
export interface AntibioticConsistencyRecordV14 {
  hasIndication: boolean;
  hasCulture: boolean;
  hasDeEscalation: boolean;
}

/** 抗菌药物一致性检查结果 */
export interface AntibioticConsistencyResultV14 {
  pass: boolean;
  defects: string[];
}

/** 抗菌药物联动报告 */
export interface AntibioticLinkReportV14 {
  pass: boolean;
  defectCount: number;
}

/**
 * 构建质控-抗菌药物联动数据。
 *
 * @param recordId 病历记录ID
 * @param antibioticName 抗菌药物名
 * @param days 使用天数
 * @returns 联动数据
 */
export function buildAntibioticLink(recordId: string, antibioticName: string, days: number): AntibioticLinkV14 {
  return { recordId, antibioticName, days };
}

/**
 * 检查抗菌药物一致性（三个字段都 true 才 pass，否则列出缺失项）。
 *
 * @param record 抗菌药物一致性检查入参
 * @returns 检查结果（pass + defects）
 */
export function checkAntibioticConsistency(record: AntibioticConsistencyRecordV14): AntibioticConsistencyResultV14 {
  // 手算检查：三个字段都 true 才 pass，否则列出缺失项
  const defects: string[] = [];
  if (!record.hasIndication) {
    defects.push("缺用药指征");
  }
  if (!record.hasCulture) {
    defects.push("缺病原学检查");
  }
  if (!record.hasDeEscalation) {
    defects.push("缺降阶梯记录");
  }
  return { pass: defects.length === 0, defects };
}

/**
 * 构建抗菌药物联动报告。
 *
 * @param result 检查结果
 * @returns 报告（pass + defectCount）
 */
export function buildAntibioticLinkReport(result: AntibioticConsistencyResultV14): AntibioticLinkReportV14 {
  return {
    pass: result.pass,
    defectCount: result.defects.length,
  };
}
