/**
 * 健澜科技 jlmedaios - 患者侧经验转健康提示 V13 纯函数（M295-C）
 *
 * translateToPatientTipV13 / filterPatientSafeV13 / buildPatientTipFeedV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者侧经验 */
export interface PatientExperienceV13 {
  experienceId: string;
  category: "lifestyle" | "medication_adherence" | "prescription_decision";
  title: string;
  content: string;
  tags: string[];
}

/** 患者健康提示 */
export interface PatientTipV13 {
  experienceId: string;
  tipTitle: string;
  tipContent: string;
  disclaimer: string;
}

/**
 * 患者侧转译（纯函数）：通俗化 + 加"仅供参考，遵医嘱"。
 *
 * @param e 经验
 * @returns 患者提示
 */
export function translateToPatientTipV13(e: PatientExperienceV13): PatientTipV13 {
  const plain = e.content
    .replace(/抗凝/g, "按规定时间吃药")
    .replace(/华法林/g, "您正在服用的抗凝药")
    .replace(/相互作用/g, "同时吃可能有冲突")
    .replace(/诊断/g, "医生判断");
  return {
    experienceId: e.experienceId,
    tipTitle: e.title,
    tipContent: plain,
    disclaimer: "仅供参考，遵医嘱",
  };
}

/**
 * 患者安全过滤（纯函数）：只保留 lifestyle / medication_adherence，过滤 prescription_decision。
 *
 * @param experiences 经验列表
 * @returns 安全可推
 */
export function filterPatientSafeV13(experiences: PatientExperienceV13[]): PatientExperienceV13[] {
  return experiences.filter(
    (e) => e.category === "lifestyle" || e.category === "medication_adherence",
  );
}

/**
 * 按患者标签匹配个性化提示（纯函数）：至少1个标签命中。
 *
 * @param patientTags 患者标签
 * @param experiences 经验列表
 * @returns 匹配后的提示
 */
export function buildPatientTipFeedV13(
  patientTags: string[],
  experiences: PatientExperienceV13[],
): PatientTipV13[] {
  const safe = filterPatientSafeV13(experiences);
  const matched = safe.filter((e) => e.tags.some((t) => patientTags.includes(t)));
  return matched.map(translateToPatientTipV13);
}
