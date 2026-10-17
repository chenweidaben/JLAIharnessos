/**
 * 健澜科技 jlmedaios - 院感暴发早期预警 V13 纯函数（M313-D）
 *
 * countDeptPathogenV13 / detectOutbreakV13 / buildOutbreakMatrixV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感病例 */
export interface InfectionCaseV13 {
  caseId: string;
  dept: string;
  pathogen: string;
}

/** 科室×病原计数 */
export interface DeptPathogenCellV13 {
  dept: string;
  pathogen: string;
  count: number;
}

/** 矩阵单元格（带暴发标注） */
export interface MatrixCellV13 {
  dept: string;
  pathogen: string;
  count: number;
  isOutbreak: boolean;
}

/**
 * 按科室×病原统计（纯函数）：一周内出现例数。
 *
 * @param cases 病例列表
 * @returns 计数列表
 */
export function countDeptPathogenV13(cases: InfectionCaseV13[]): DeptPathogenCellV13[] {
  const map = new Map<string, number>();
  for (const c of cases) {
    const key = `${c.dept}|${c.pathogen}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => {
    const [dept, pathogen] = key.split("|");
    return { dept, pathogen, count };
  });
}

/**
 * 暴发检测（纯函数）：同科室×同病原 ≥ threshold → 红牌。
 *
 * @param matrix 计数矩阵
 * @param threshold 阈值
 * @returns 暴发单元格列表
 */
export function detectOutbreakV13(
  matrix: DeptPathogenCellV13[],
  threshold: number,
): DeptPathogenCellV13[] {
  return matrix.filter((cell) => cell.count >= threshold);
}

/**
 * 矩阵展示（纯函数）：红牌标注暴发单元格。
 *
 * @param matrix 计数矩阵
 * @param outbreaks 暴发列表
 * @returns 带标注矩阵
 */
export function buildOutbreakMatrixV13(
  matrix: DeptPathogenCellV13[],
  outbreaks: DeptPathogenCellV13[],
): MatrixCellV13[] {
  const outbreakKeys = new Set(outbreaks.map((o) => `${o.dept}|${o.pathogen}`));
  return matrix.map((cell) => ({
    ...cell,
    isOutbreak: outbreakKeys.has(`${cell.dept}|${cell.pathogen}`),
  }));
}
