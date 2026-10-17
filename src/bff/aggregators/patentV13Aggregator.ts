/**
 * 健澜科技 jlmedaios - 专利授权 V13 纯函数（M343-D）
 *
 * computeInventionCountV13 / computeUtilityModelCountV13 / computeDesignCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专利授权记录 */
export interface PatentRecordV13 {
  inventionCount: number;
  utilityModelCount: number;
  designCount: number;
}

/**
 * 发明专利授权数（纯函数）：求和。
 *
 * @param records 专利授权记录列表
 * @returns 发明专利授权数
 */
export function computeInventionCountV13(records: PatentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inventionCount, 0);
}

/**
 * 实用新型授权数（纯函数）：求和。
 *
 * @param records 专利授权记录列表
 * @returns 实用新型授权数
 */
export function computeUtilityModelCountV13(records: PatentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.utilityModelCount, 0);
}

/**
 * 外观设计授权数（纯函数）：求和。
 *
 * @param records 专利授权记录列表
 * @returns 外观设计授权数
 */
export function computeDesignCountV13(records: PatentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.designCount, 0);
}
