/**
 * 健澜科技 jlmedaios - 病历一致性检查 V14 聚合器（M476-B）
 *
 * 纯函数：段落间一致性检测（关键词矛盾对）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历段落 */
export interface EmrSectionV14 {
  name: string;
  content: string;
}

/** 一致性检查结果 */
export interface ConsistencyResultV14 {
  conflictCount: number;
  conflicts: string[];
}

/** 矛盾关键词对（A 与 B 不应同时出现） */
const CONTRADICTION_PAIRS: { a: string; b: string; label: string }[] = [
  { a: "发热", b: "体温正常", label: "发热 vs 体温正常" },
  { a: "高血压", b: "血压正常", label: "高血压 vs 血压正常" },
];

/**
 * 找出冲突项描述：遍历矛盾对，若任意段落同时含 A 和 B，或不同段落分别含 A 和 B，则视为冲突。
 *
 * @param sections 段落列表
 * @returns 冲突描述列表
 */
export function findConsistencyConflicts(sections: EmrSectionV14[]): string[] {
  const conflicts: string[] = [];
  for (const pair of CONTRADICTION_PAIRS) {
    const sectionsWithA = sections.filter((s) => s.content.includes(pair.a));
    const sectionsWithB = sections.filter((s) => s.content.includes(pair.b));
    if (sectionsWithA.length > 0 && sectionsWithB.length > 0) {
      const aNames = sectionsWithA.map((s) => s.name).join("、");
      const bNames = sectionsWithB.map((s) => s.name).join("、");
      conflicts.push(`${pair.label}（${aNames} 提到 ${pair.a}，${bNames} 提到 ${pair.b}）`);
    }
  }
  return conflicts;
}

/**
 * 检查病历一致性。
 *
 * @param sections 段落列表
 * @returns 一致性检查结果
 */
export function checkConsistency(sections: EmrSectionV14[]): ConsistencyResultV14 {
  const conflicts = findConsistencyConflicts(sections);
  return { conflictCount: conflicts.length, conflicts };
}
