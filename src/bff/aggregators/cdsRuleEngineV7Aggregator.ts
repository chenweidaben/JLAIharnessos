/**
 * 健澜科技 jlmedaios - 处方前置审核规则引擎 V7 纯函数（M289-A）
 *
 * checkDrugInteractionV7 / checkContraindicationV7 / checkDoseV7 / auditPrescriptionV7
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** CDS 规则 */
export interface CdsRule {
  id: string;
  type: "interaction" | "contraindication" | "dose";
  drugCode: string;
  target: string;
  severity: "info" | "warning" | "critical";
  message: string;
  enabled: boolean;
}

/** 处方 */
export interface PrescriptionV7 {
  drugs: { code: string; dose: number }[];
}

/**
 * 药物相互作用 V7（纯函数）：rules.type="interaction" 且 drugs 同时含 drugCode 与 target 即命中。
 *
 * @param rules 规则列表
 * @param drugs 处方药品 code 列表
 * @returns 命中规则
 */
export function checkDrugInteractionV7(rules: CdsRule[], drugs: string[]): CdsRule[] {
  return rules.filter((r) => {
    if (!r.enabled || r.type !== "interaction") return false;
    return drugs.includes(r.drugCode) && drugs.includes(r.target);
  });
}

/**
 * 禁忌 V7（纯函数）：rules.type="contraindication" 且 drug 匹配且 patientTags 含 target 即命中。
 *
 * @param rules 规则列表
 * @param drug 当前药品 code
 * @param patientTags 患者标签
 * @returns 命中规则
 */
export function checkContraindicationV7(rules: CdsRule[], drug: string, patientTags: string[]): CdsRule[] {
  return rules.filter((r) => {
    if (!r.enabled || r.type !== "contraindication") return false;
    return r.drugCode === drug && patientTags.includes(r.target);
  });
}

/**
 * 剂量超限 V7（纯函数）：rules.type="dose" 且 drug 匹配且 dose>target 即命中。
 *
 * @param rules 规则列表
 * @param drug 当前药品 code
 * @param dose 实际剂量
 * @returns 命中规则
 */
export function checkDoseV7(rules: CdsRule[], drug: string, dose: number): CdsRule[] {
  return rules.filter((r) => {
    if (!r.enabled || r.type !== "dose") return false;
    return r.drugCode === drug && dose > Number(r.target);
  });
}

/**
 * 处方审核汇总 V7（纯函数）：合并三类命中。
 *
 * @param rules 规则列表
 * @param prescription 处方
 * @param patientTags 患者标签
 * @returns 审核结果
 */
export function auditPrescriptionV7(
  rules: CdsRule[],
  prescription: PrescriptionV7,
  patientTags: string[],
): { hits: CdsRule[]; criticalCount: number; warningCount: number; pass: boolean } {
  const drugCodes = prescription.drugs.map((d) => d.code);
  const interactions = checkDrugInteractionV7(rules, drugCodes);
  const contraindications: CdsRule[] = [];
  const doses: CdsRule[] = [];
  for (const d of prescription.drugs) {
    contraindications.push(...checkContraindicationV7(rules, d.code, patientTags));
    doses.push(...checkDoseV7(rules, d.code, d.dose));
  }
  const hits = [...interactions, ...contraindications, ...doses];
  const criticalCount = hits.filter((h) => h.severity === "critical").length;
  const warningCount = hits.filter((h) => h.severity === "warning").length;
  return {
    hits,
    criticalCount,
    warningCount,
    pass: criticalCount === 0,
  };
}
