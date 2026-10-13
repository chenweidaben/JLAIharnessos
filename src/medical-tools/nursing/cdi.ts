/**
 * 健澜科技 jlmedaios - 合理用药审查 CDI 纯函数（M70-A）
 * 相互作用 / 过敏 / 剂量审查 + 严重度合并。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type Severity = 'info' | 'warning' | 'block';

const SEV_RANK: Record<Severity, number> = { info: 0, warning: 1, block: 2 };

/** 两严重度取最高级。 */
export function worseSeverity(a: Severity, b: Severity): Severity {
  return SEV_RANK[a] >= SEV_RANK[b] ? a : b;
}

/** 药物相互作用审查：新药与在用药列表命中已知相互作用对 -> warning/block。
 *  简化规则：同类药（如 warfarin+aspirin、heparin+warfarin）合并 -> block。 */
export function checkInteraction(newDrug: string, currentDrugs: string[]): Severity {
  const nd = newDrug.trim().toLowerCase();
  for (const d of currentDrugs) {
    const cd = d.trim().toLowerCase();
    // 简化：抗凝/抗血小板叠加 -> block
    if ((nd === 'warfarin' && cd === 'aspirin') || (nd === 'aspirin' && cd === 'warfarin')) return 'block';
    if ((nd === 'heparin' && cd === 'warfarin') || (nd === 'warfarin' && cd === 'heparin')) return 'block';
  }
  return 'info';
}

/** 过敏审查：新药命中患者过敏史 -> block。 */
export function checkAllergy(newDrug: string, allergies: string[]): Severity {
  const nd = newDrug.trim().toLowerCase();
  for (const a of allergies) {
    if (a.trim().toLowerCase() === nd) return 'block';
  }
  return 'info';
}

/** 剂量审查：按体重换算超限 -> warning/block。
 *  简化：日剂量 mg/kg 上限 10，超 10 block，超 5 warning。 */
export function checkDose(drug: string, doseMg: number, weightKg: number): Severity {
  if (!weightKg || weightKg <= 0) return 'info';
  const perKg = doseMg / weightKg;
  if (perKg > 10) return 'block';
  if (perKg > 5) return 'warning';
  return 'info';
}
