/**
 * 健澜科技 jlmedaios - 经验与临床结局关联 V13 纯函数（M300-A）
 *
 * linkExperienceToOutcomeV13 / computeEffectSizeV13 / rankEvidenceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者结局 */
export interface PatientOutcomeV13 {
  patientId: string;
  experienceId: string | null;
  complicationRate: number;
}

/** 证据条目 */
export interface EvidenceExpV13 {
  experienceId: string;
  effectSize: number;
}

/** 关联结果 */
export interface LinkedOutcomeV13 {
  experienceId: string;
  usedPatients: PatientOutcomeV13[];
  controlPatients: PatientOutcomeV13[];
}

/**
 * 经验-结局关联（纯函数）：usedGroup = experienceId 匹配；controlGroup = experienceId 为 null。
 *
 * @param experienceId 经验ID
 * @param outcomes 患者结局列表
 * @returns 关联结果
 */
export function linkExperienceToOutcomeV13(
  experienceId: string,
  outcomes: PatientOutcomeV13[],
): LinkedOutcomeV13 {
  return {
    experienceId,
    usedPatients: outcomes.filter((o) => o.experienceId === experienceId),
    controlPatients: outcomes.filter((o) => o.experienceId === null),
  };
}

/**
 * 效应量（纯函数）：usedGroup 平均并发症率 − controlGroup 平均并发症率，保留1位。
 *
 * @param usedGroup 使用该经验的患者
 * @param controlGroup 对照组
 * @returns 效应量（负数=改善）
 */
export function computeEffectSizeV13(
  usedGroup: PatientOutcomeV13[],
  controlGroup: PatientOutcomeV13[],
): number {
  if (usedGroup.length === 0 || controlGroup.length === 0) return 0;
  const usedAvg = usedGroup.reduce((s, p) => s + p.complicationRate, 0) / usedGroup.length;
  const ctrlAvg = controlGroup.reduce((s, p) => s + p.complicationRate, 0) / controlGroup.length;
  return Math.round((usedAvg - ctrlAvg) * 10) / 10;
}

/**
 * 证据强度分级（纯函数）：|effect|≥10 strong / ≥5 moderate / ≥2 weak / <2 inconclusive。
 *
 * @param experiencesWithEffect 带效应量的经验列表
 * @returns 按 |effect| 降序排，带强度
 */
export function rankEvidenceV13(
  experiencesWithEffect: EvidenceExpV13[],
): Array<EvidenceExpV13 & { strength: "strong" | "moderate" | "weak" | "inconclusive" }> {
  return experiencesWithEffect
    .map((e) => {
      const abs = Math.abs(e.effectSize);
      let strength: "strong" | "moderate" | "weak" | "inconclusive" = "inconclusive";
      if (abs >= 10) strength = "strong";
      else if (abs >= 5) strength = "moderate";
      else if (abs >= 2) strength = "weak";
      return { ...e, strength };
    })
    .sort((a, b) => Math.abs(b.effectSize) - Math.abs(a.effectSize));
}
