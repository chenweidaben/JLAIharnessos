/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐明细 V14 聚合器（M508-C，-detail 避让）
 *
 * 纯函数：AI 推荐相似病历 + 推荐报告构建。
 * 避让说明：M486-D 已有 emrQcAiSimilarRecordV14，本切片改用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 相似病历条目 */
export interface AiSimilarRecordItemDetailV14 {
  title: string;
  similarity: number;
}

/** 相似推荐结果 */
export interface AiSimilarRecordResultDetailV14 {
  records: AiSimilarRecordItemDetailV14[];
}

/** 相似推荐报告 */
export interface AiSimilarRecordReportDetailV14 {
  count: number;
  avgSimilarity: number;
}

/**
 * AI 推荐相似病历（根据诊断关键词返回预设匹配病历列表）。
 *
 * @param diagnosis 诊断
 * @returns 推荐结果（records 数组）
 */
export function recommendSimilar(diagnosis: string): AiSimilarRecordResultDetailV14 {
  // 手算推荐：根据诊断关键词返回预设匹配病历列表，相似度为预设分数
  const records: AiSimilarRecordItemDetailV14[] = [];
  if (diagnosis.includes("阑尾")) {
    records.push({ title: "急性阑尾炎伴穿孔案例", similarity: 95 });
    records.push({ title: "慢性阑尾炎急性发作", similarity: 88 });
  }
  if (diagnosis.includes("肺炎")) {
    records.push({ title: "社区获得性肺炎(重症)", similarity: 92 });
    records.push({ title: "病毒性肺炎诊疗记录", similarity: 85 });
  }
  if (diagnosis.includes("骨折")) {
    records.push({ title: "胫骨骨折术后康复", similarity: 90 });
    records.push({ title: "桡骨远端骨折保守治疗", similarity: 82 });
  }
  if (records.length === 0) {
    records.push({ title: "相似病历参考1", similarity: 80 });
    records.push({ title: "相似病历参考2", similarity: 75 });
  }
  return { records };
}

/**
 * 构建推荐报告。
 *
 * @param result 推荐结果
 * @returns 推荐报告（count + avgSimilarity）
 */
export function buildSimilarReport(result: AiSimilarRecordResultDetailV14): AiSimilarRecordReportDetailV14 {
  if (result.records.length === 0) {
    return { count: 0, avgSimilarity: 0 };
  }
  // 手算报告：count=length，avgSimilarity=Math.round(sum/length)
  const sum = result.records.reduce((acc, r) => acc + r.similarity, 0);
  const avgSimilarity = Math.round(sum / result.records.length);
  return { count: result.records.length, avgSimilarity };
}
