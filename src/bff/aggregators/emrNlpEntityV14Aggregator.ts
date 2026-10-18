/**
 * 健澜科技 jlmedaios - NLP 病历实体识别 V14 聚合器（M490-A）
 *
 * 纯函数：医学实体提取 + 实体报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 实体识别结果 */
export interface NlpEntityResultV14 {
  entities: string[];
}

/** 实体报告 */
export interface NlpEntityReportV14 {
  entityCount: number;
}

/** 医学实体词典（模拟 NLP 实体识别） */
const MEDICAL_ENTITY_DICT = [
  "糖尿病", "高血压", "冠心病", "肺炎", "胃炎",
  "头痛", "发热", "咳嗽", "腹痛", "恶心",
  "胰岛素", "二甲双胍", "阿司匹林", "降压药", "抗生素",
];

/**
 * 从病历正文提取医学实体（模拟 NLP 实体识别）。
 *
 * @param content 病历正文
 * @returns 实体识别结果
 */
export function extractMedicalEntities(content: string): NlpEntityResultV14 {
  if (!content) {
    return { entities: [] };
  }
  // 手算：遍历词典，命中则加入 entities
  const entities: string[] = [];
  for (const entity of MEDICAL_ENTITY_DICT) {
    if (content.includes(entity)) {
      entities.push(entity);
    }
  }
  return { entities };
}

/**
 * 构建实体报告（entityCount）。
 *
 * @param result 实体识别结果
 * @returns 实体报告
 */
export function buildEntityReport(result: NlpEntityResultV14): NlpEntityReportV14 {
  // 手算：entityCount = entities.length
  return { entityCount: result.entities.length };
}
