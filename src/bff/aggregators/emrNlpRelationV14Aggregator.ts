/**
 * 健澜科技 jlmedaios - NLP 病历关系抽取 V14 聚合器（M490-B）
 *
 * 纯函数：医学关系提取 + 关系报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 关系抽取结果 */
export interface NlpRelationResultV14 {
  relations: string[];
}

/** 关系报告 */
export interface NlpRelationReportV14 {
  relationCount: number;
}

/** 医学关系词典（模拟 NLP 关系抽取） */
const MEDICAL_RELATION_DICT = [
  "治疗", "导致", "禁忌",
];

/**
 * 从病历正文提取医学关系（模拟 NLP 关系抽取）。
 *
 * @param content 病历正文
 * @returns 关系抽取结果
 */
export function extractMedicalRelations(content: string): NlpRelationResultV14 {
  if (!content) {
    return { relations: [] };
  }
  // 手算：遍历关系词典，命中则加入 relations
  const relations: string[] = [];
  for (const relation of MEDICAL_RELATION_DICT) {
    if (content.includes(relation)) {
      relations.push(relation);
    }
  }
  return { relations };
}

/**
 * 构建关系报告（relationCount）。
 *
 * @param result 关系抽取结果
 * @returns 关系报告
 */
export function buildRelationReport(result: NlpRelationResultV14): NlpRelationReportV14 {
  // 手算：relationCount = relations.length
  return { relationCount: result.relations.length };
}
