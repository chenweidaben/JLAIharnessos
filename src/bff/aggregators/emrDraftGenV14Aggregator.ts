/**
 * 健澜科技 jlmedaios - 病历 AI 草稿生成 V14 聚合器（M462-A）
 *
 * 模板填充，不调 LLM：按入院记录/病程记录模板拼接段落文本。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 入院记录草稿输入 */
export interface AdmissionDraftInputV14 {
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  diagnosis: string;
}

/** 病程记录草稿输入 */
export interface ProgressNoteDraftInputV14 {
  date: string;
  bodyCondition: string;
  treatmentAdjustment: string;
  plan: string;
}

/**
 * 按入院记录模板拼接段落文本。
 *
 * @param input 入院记录输入（主诉/现病史/体格检查/初步诊断）
 * @returns 拼接后的草稿文本
 */
export function buildAdmissionDraft(input: AdmissionDraftInputV14): string {
  const parts = [
    `主诉：${input.chiefComplaint ?? ""}`,
    `现病史：${input.presentIllness ?? ""}`,
    `体格检查：${input.physicalExam ?? ""}`,
    `初步诊断：${input.diagnosis ?? ""}`,
  ];
  return parts.join("\n");
}

/**
 * 按病程记录模板拼接段落文本。
 *
 * @param input 病程记录输入（日期/目前情况/诊疗调整/下一步计划）
 * @returns 拼接后的草稿文本
 */
export function buildProgressNoteDraft(input: ProgressNoteDraftInputV14): string {
  const parts = [
    `日期：${input.date ?? ""}`,
    `目前情况：${input.bodyCondition ?? ""}`,
    `诊疗调整：${input.treatmentAdjustment ?? ""}`,
    `下一步计划：${input.plan ?? ""}`,
  ];
  return parts.join("\n");
}
