/**
 * 健澜科技 jlmedaios - 病历AI术后镇痛方案推荐 V14 聚合器（M562-D）
 *
 * 纯函数：构建 AI 术后镇痛方案推荐基础数据 + AI 术后镇痛方案推荐 + 构建术后镇痛方案推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 术后镇痛方案推荐基础数据 */
export interface AiPostopAnalgesiaRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 术后镇痛方案推荐输入 */
export interface AiPostopAnalgesiaRecoInputV14 {
  surgeryType: string;
  painScore: number;
}

/** AI 术后镇痛方案推荐结果 */
export interface AiPostopAnalgesiaRecoResultV14 {
  planName: string;
  dosage: string;
}

/** 术后镇痛方案推荐报告 */
export interface AiPostopAnalgesiaRecoReportV14 {
  planName: string;
  dosage: string;
}

/**
 * 构建 AI 术后镇痛方案推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 术后镇痛方案推荐基础数据
 */
export function buildAiPostopAnalgesiaReco(recordId: string, dept: string): AiPostopAnalgesiaRecoV14 {
  return { recordId, dept };
}

/**
 * AI 术后镇痛方案推荐。
 * planName = surgeryType.includes('心脏') ? '静脉镇痛泵'
 *   : painScore >= 7 ? '口服止痛药+静脉镇痛' : '口服止痛药'
 * dosage = planName.includes('静脉') ? '根据体重调整' : '按说明书剂量'
 *
 * @param input 术后镇痛方案推荐输入（手术类型 + 疼痛评分）
 * @returns 术后镇痛方案推荐结果（planName + dosage）
 */
export function recommendPostopAnalgesiaByAi(input: AiPostopAnalgesiaRecoInputV14): AiPostopAnalgesiaRecoResultV14 {
  // 手算：planName = surgeryType.includes('心脏') ? '静脉镇痛泵'
  //   : painScore >= 7 ? '口服止痛药+静脉镇痛' : '口服止痛药'
  // 测试2：surgeryType='心脏搭桥手术' → includes('心脏')=true → '静脉镇痛泵'
  // 测试3：surgeryType='胆囊切除术' → includes('心脏')=false；painScore=8>=7=true → '口服止痛药+静脉镇痛'
  const planName = input.surgeryType.includes("心脏")
    ? "静脉镇痛泵"
    : input.painScore >= 7
      ? "口服止痛药+静脉镇痛"
      : "口服止痛药";
  // 手算：dosage = planName.includes('静脉') ? '根据体重调整' : '按说明书剂量'
  // 测试2：planName='静脉镇痛泵' → includes('静脉')=true → '根据体重调整'
  // 测试3：planName='口服止痛药+静脉镇痛' → includes('静脉')=true → '根据体重调整'
  const dosage = planName.includes("静脉") ? "根据体重调整" : "按说明书剂量";
  return { planName, dosage };
}

/**
 * 构建术后镇痛方案推荐报告。
 *
 * @param result 术后镇痛方案推荐结果
 * @returns 术后镇痛方案推荐报告（planName + dosage 透传）
 */
export function buildAiPostopAnalgesiaRecoReport(result: AiPostopAnalgesiaRecoResultV14): AiPostopAnalgesiaRecoReportV14 {
  // 手算：透传 planName + dosage
  // 测试4：{planName='静脉镇痛泵', dosage='根据体重调整'} → 透传
  return { planName: result.planName, dosage: result.dosage };
}
