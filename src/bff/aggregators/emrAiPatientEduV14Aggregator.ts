/**
 * 健澜科技 jlmedaios - 病历AI患者教育材料生成 V14 聚合器（M547-B）
 *
 * 纯函数：构建 AI 患者教育材料基础数据 + AI 患者教育材料生成 + 构建教育材料报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 患者教育材料基础数据 */
export interface AiPatientEduV14 {
  recordId: string;
  dept: string;
}

/** AI 患者教育材料生成输入 */
export interface AiPatientEduInputV14 {
  diagnosis: string;
}

/** AI 患者教育材料生成结果 */
export interface AiPatientEduResultV14 {
  title: string;
  content: string;
}

/** 教育材料报告 */
export interface AiPatientEduReportV14 {
  title: string;
  content: string;
}

/**
 * 构建 AI 患者教育材料基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 患者教育材料基础数据
 */
export function buildAiPatientEdu(recordId: string, dept: string): AiPatientEduV14 {
  return { recordId, dept };
}

/**
 * AI 患者教育材料生成。
 * title = diagnosis.includes('心梗') ? '心梗患者居家康复指南' : '常见病健康宣教'
 * content = title.includes('心梗') ? '按时服药、定期复查、避免剧烈运动、保持情绪稳定' : '遵医嘱用药、注意休息、均衡饮食'
 *
 * @param input 教育材料输入（诊断）
 * @returns 教育材料结果（title + content）
 */
export function generatePatientEduByAi(input: AiPatientEduInputV14): AiPatientEduResultV14 {
  // 手算：title = diagnosis.includes('心梗') ? '心梗患者居家康复指南' : '常见病健康宣教'
  // 测试2：diagnosis='急性心梗' → 含'心梗' → title='心梗患者居家康复指南'
  // 测试3：diagnosis='上感' → 不含'心梗' → title='常见病健康宣教'
  const title = input.diagnosis.includes("心梗") ? "心梗患者居家康复指南" : "常见病健康宣教";
  // 手算：content = title.includes('心梗') ? '按时服药、定期复查、避免剧烈运动、保持情绪稳定' : '遵医嘱用药、注意休息、均衡饮食'
  // 测试2：title='心梗患者居家康复指南' → 含'心梗' → content='按时服药、定期复查、避免剧烈运动、保持情绪稳定'（4条注意事项）
  // 测试3：title='常见病健康宣教' → 不含'心梗' → content='遵医嘱用药、注意休息、均衡饮食'（3条建议）
  const content = title.includes("心梗")
    ? "按时服药、定期复查、避免剧烈运动、保持情绪稳定"
    : "遵医嘱用药、注意休息、均衡饮食";
  return { title, content };
}

/**
 * 构建教育材料报告。
 *
 * @param result 教育材料结果
 * @returns 教育材料报告（title + content 透传）
 */
export function buildAiPatientEduReport(result: AiPatientEduResultV14): AiPatientEduReportV14 {
  // 手算：透传 title + content
  // 测试4：{title='心梗患者居家康复指南', content='按时服药、定期复查、避免剧烈运动、保持情绪稳定'} → 透传
  return { title: result.title, content: result.content };
}
