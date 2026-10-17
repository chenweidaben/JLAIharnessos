/**
 * 健澜科技 jlmedaios - 修改点归因与经验补丁 V13 纯函数（M301-B）
 *
 * attributeModificationV13 / generateExperiencePatchV13 / applyPatchV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 修改点反馈 */
export interface FeedbackModV13 {
  feedbackId: string;
  suggestionId: string;
  modificationNote: string;
}

/** 归因结果 */
export interface AttributedModV13 {
  feedbackId: string;
  clause: "dose" | "timing" | "contraindication" | "unknown";
  note: string;
}

/** 经验补丁 */
export interface ExperiencePatchV13 {
  patchId: string;
  experienceId: string;
  clause: "dose" | "timing" | "contraindication" | "unknown";
  suggestion: string;
}

/** 经验（旧版） */
export interface ExperienceForPatchV13 {
  experienceId: string;
  version: number;
  content: string;
}

/**
 * 修改点归因（纯函数）：关键词匹配 → dose/timing/contraindication/unknown。
 *
 * @param feedback 反馈
 * @returns 归因结果
 */
export function attributeModificationV13(feedback: FeedbackModV13): AttributedModV13 {
  const note = feedback.modificationNote;
  let clause: AttributedModV13["clause"] = "unknown";
  if (note.includes("剂量") || note.includes("dose")) clause = "dose";
  else if (note.includes("时机") || note.includes("时间") || note.includes("推后")) clause = "timing";
  else if (note.includes("禁忌") || note.includes("不符合")) clause = "contraindication";
  return {
    feedbackId: feedback.feedbackId,
    clause,
    note,
  };
}

/**
 * 生成经验补丁（纯函数）：按 clause 合并，每类生成一条补丁建议。
 *
 * @param attributedMods 归因结果列表
 * @returns 补丁列表
 */
export function generateExperiencePatchV13(
  attributedMods: AttributedModV13[],
): ExperiencePatchV13[] {
  const map = new Map<AttributedModV13["clause"], number>();
  for (const m of attributedMods) {
    map.set(m.clause, (map.get(m.clause) ?? 0) + 1);
  }
  const suggestions: Record<AttributedModV13["clause"], string> = {
    dose: "下调剂量上限并标注个体差异",
    timing: "调整给药/手术时机窗",
    contraindication: "补充禁忌人群说明",
    unknown: "待人工复核",
  };
  return [...map.entries()].map(([clause, count], idx): ExperiencePatchV13 => ({
    patchId: `patch-${idx + 1}`,
    experienceId: "e-1",
    clause,
    suggestion: `${suggestions[clause]}（来自 ${count} 条医生反馈）`,
  }));
}

/**
 * 应用补丁（纯函数）：version+1，旧版保留（函数式返回新对象）。
 *
 * @param experience 旧版经验
 * @param patch 补丁
 * @returns 新版本经验
 */
export function applyPatchV13(
  experience: ExperienceForPatchV13,
  patch: ExperiencePatchV13,
): ExperienceForPatchV13 {
  return {
    experienceId: experience.experienceId,
    version: experience.version + 1,
    content: `${experience.content}【${patch.clause}补丁】${patch.suggestion}`,
  };
}
