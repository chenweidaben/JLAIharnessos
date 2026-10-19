/**
 * 健澜科技 jlmedaios - 病历AI急诊分诊分级推荐 V14 聚合器（M560-A）
 *
 * 纯函数：构建 AI 急诊分诊分级推荐基础数据 + AI 急诊分诊分级推荐 + 构建急诊分诊分级推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 急诊分诊分级推荐基础数据 */
export interface AiEmergencyTriageRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 急诊分诊分级推荐输入 */
export interface AiEmergencyTriageRecoInputV14 {
  symptom: string;
  vitalAbnormal: boolean;
}

/** AI 急诊分诊分级推荐结果 */
export interface AiEmergencyTriageRecoResultV14 {
  level: string;
  waitTime: number;
}

/** 急诊分诊分级推荐报告 */
export interface AiEmergencyTriageRecoReportV14 {
  level: string;
  waitTime: number;
}

/**
 * 构建 AI 急诊分诊分级推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 急诊分诊分级推荐基础数据
 */
export function buildAiEmergencyTriageReco(recordId: string, dept: string): AiEmergencyTriageRecoV14 {
  return { recordId, dept };
}

/**
 * AI 急诊分诊分级推荐。
 * level = (symptom.includes('胸痛') || vitalAbnormal) ? '一级（濒危）'
 *   : symptom.includes('腹痛') ? '二级（危重）' : '三级（急症）'
 * waitTime = level.includes('一级') ? 0 : level.includes('二级') ? 10 : 30
 *
 * @param input 分诊分级推荐输入（症状 + 生命体征异常）
 * @returns 分诊分级推荐结果（level + waitTime）
 */
export function recommendEmergencyTriageByAi(input: AiEmergencyTriageRecoInputV14): AiEmergencyTriageRecoResultV14 {
  // 手算：level = (symptom.includes('胸痛') || vitalAbnormal) ? '一级（濒危）'
  //   : symptom.includes('腹痛') ? '二级（危重）' : '三级（急症）'
  // 测试2：symptom='胸痛伴呼吸困难', vitalAbnormal=true
  //   = (true || true) = true → '一级（濒危）'
  // 测试3：symptom='轻微头痛', vitalAbnormal=false
  //   = (false || false) = false；'轻微头痛'.includes('腹痛')=false → '三级（急症）'
  const level = (input.symptom.includes("胸痛") || input.vitalAbnormal)
    ? "一级（濒危）"
    : input.symptom.includes("腹痛")
      ? "二级（危重）"
      : "三级（急症）";
  // 手算：waitTime = level.includes('一级') ? 0 : level.includes('二级') ? 10 : 30
  // 测试2：level='一级（濒危）' → waitTime=0
  // 测试3：level='三级（急症）' → waitTime=30
  const waitTime = level.includes("一级") ? 0 : level.includes("二级") ? 10 : 30;
  return { level, waitTime };
}

/**
 * 构建急诊分诊分级推荐报告。
 *
 * @param result 分诊分级推荐结果
 * @returns 分诊分级推荐报告（level + waitTime 透传）
 */
export function buildAiEmergencyTriageRecoReport(result: AiEmergencyTriageRecoResultV14): AiEmergencyTriageRecoReportV14 {
  // 手算：透传 level + waitTime
  // 测试4：{level='一级（濒危）', waitTime=0} → 透传
  return { level: result.level, waitTime: result.waitTime };
}
