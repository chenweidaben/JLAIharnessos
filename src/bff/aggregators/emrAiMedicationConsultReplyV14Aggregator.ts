/**
 * 健澜科技 jlmedaios - 病历AI用药咨询答复 V14 聚合器（M565-B）
 *
 * 纯函数：构建 AI 用药咨询答复基础数据 + AI 用药咨询答复 + 构建用药咨询答复报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 用药咨询答复基础数据 */
export interface AiMedicationConsultReplyV14 {
  recordId: string;
  dept: string;
}

/** AI 用药咨询答复输入 */
export interface AiMedicationConsultReplyInputV14 {
  question: string;
  drugName: string;
}

/** AI 用药咨询答复结果 */
export interface AiMedicationConsultReplyResultV14 {
  reply: string;
  warning: string;
}

/** 用药咨询答复报告 */
export interface AiMedicationConsultReplyReportV14 {
  reply: string;
  warning: string;
}

/**
 * 构建 AI 用药咨询答复基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 用药咨询答复基础数据
 */
export function buildAiMedicationConsultReply(recordId: string, dept: string): AiMedicationConsultReplyV14 {
  return { recordId, dept };
}

/**
 * AI 用药咨询答复。
 * reply = question.includes('饭前') ? `${drugName}建议饭前30分钟服用`
 *   : question.includes('饭后') ? `${drugName}建议饭后15分钟服用`
 *   : `${drugName}按医嘱服用即可`
 * warning = question.includes('副作用') ? '如有不适请及时就医' : '无特殊警告'
 *
 * @param input 用药咨询答复输入（咨询问题 + 药品名称）
 * @returns 用药咨询答复结果（reply + warning）
 */
export function replyMedicationConsultByAi(input: AiMedicationConsultReplyInputV14): AiMedicationConsultReplyResultV14 {
  // 手算：reply = question.includes('饭前') ? `${drugName}建议饭前30分钟服用`
  //   : question.includes('饭后') ? `${drugName}建议饭后15分钟服用`
  //   : `${drugName}按医嘱服用即可`
  // 测试2：question='这个药需要饭前吃吗？' → includes('饭前')=true → '奥美拉唑肠溶胶囊建议饭前30分钟服用'
  // 测试3：question='这个药有什么副作用？' → includes('饭前')=false, includes('饭后')=false → '布洛芬缓释胶囊按医嘱服用即可'
  const reply = input.question.includes("饭前")
    ? `${input.drugName}建议饭前30分钟服用`
    : input.question.includes("饭后")
      ? `${input.drugName}建议饭后15分钟服用`
      : `${input.drugName}按医嘱服用即可`;
  // 手算：warning = question.includes('副作用') ? '如有不适请及时就医' : '无特殊警告'
  // 测试2：question='这个药需要饭前吃吗？' → includes('副作用')=false → '无特殊警告'
  // 测试3：question='这个药有什么副作用？' → includes('副作用')=true → '如有不适请及时就医'
  const warning = input.question.includes("副作用") ? "如有不适请及时就医" : "无特殊警告";
  return { reply, warning };
}

/**
 * 构建用药咨询答复报告。
 *
 * @param result 用药咨询答复结果
 * @returns 用药咨询答复报告（reply + warning 透传）
 */
export function buildAiMedicationConsultReplyReport(result: AiMedicationConsultReplyResultV14): AiMedicationConsultReplyReportV14 {
  // 手算：透传 reply + warning
  // 测试4：{reply='测试答复', warning='测试警告'} → 透传
  return { reply: result.reply, warning: result.warning };
}
