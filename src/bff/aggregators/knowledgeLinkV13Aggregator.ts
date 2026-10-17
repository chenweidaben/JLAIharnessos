/**
 * 健澜科技 jlmedaios - 病历知识自动关联 V13 纯函数（M319-C）
 *
 * linkSimilarCasesV13 / linkRelatedSOPsV13 / computeLinkHitRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历病例 */
export interface MedicalCaseV13 {
  caseId: string;
  diagnosis: string;
}

/** SOP 条目 */
export interface SopItemV13 {
  sopId: string;
  title: string;
  keywords: string[];
}

/** 关联命中率 */
export interface LinkHitRateV13 {
  attempts: number;
  successes: number;
  hitRate: number;
}

/**
 * 关联相似历史病例（纯函数）：按诊断相似度匹配 Top N。
 *
 * @param currentCase 当前病例
 * @param history 历史病例列表
 * @returns 相似病例列表
 */
/** 提取 2-gram 子串（用于中文诊断相似度） */
function bigrams(s: string): string[] {
  const clean = s.replace(/[\/\s,，、()（）]/g, "");
  const out: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) out.push(clean.slice(i, i + 2));
  return out;
}

export function linkSimilarCasesV13(currentCase: MedicalCaseV13, history: MedicalCaseV13[]): MedicalCaseV13[] {
  const curGrams = new Set(bigrams(currentCase.diagnosis));
  return history.filter((h) => {
    if (h.caseId === currentCase.caseId) return false;
    return bigrams(h.diagnosis).some((g) => curGrams.has(g));
  });
}

/**
 * 关联相关 SOP（纯函数）：按病种关键词匹配。
 *
 * @param currentCase 当前病例
 * @param sops SOP 列表
 * @returns 相关 SOP 列表
 */
export function linkRelatedSOPsV13(currentCase: MedicalCaseV13, sops: SopItemV13[]): SopItemV13[] {
  const keywords = currentCase.diagnosis.split(/[\/\s,，、]+/).filter((k) => k.length > 0);
  return sops.filter((sop) =>
    sop.keywords.some((kw) => keywords.some((k) => kw.includes(k) || k.includes(kw))),
  );
}

/**
 * 关联命中率（纯函数）：成功关联数/尝试关联数×100。
 *
 * @param attempts 尝试关联数
 * @param successes 成功关联数
 * @returns 命中率百分比
 */
export function computeLinkHitRateV13(attempts: number, successes: number): number {
  if (attempts === 0) return 0;
  return Math.round((successes / attempts) * 100);
}
