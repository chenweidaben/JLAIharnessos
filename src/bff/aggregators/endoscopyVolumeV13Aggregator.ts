/**
 * 健澜科技 jlmedaios - 内镜检查量 V13 纯函数（M342-C）
 *
 * computeGastroscopyCountV13 / computeColonoscopyCountV13 / computeBronchoscopyCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 内镜检查量记录 */
export interface EndoscopyVolumeRecordV13 {
  gastroscopyCount: number;
  colonoscopyCount: number;
  bronchoscopyCount: number;
}

/**
 * 胃镜月度例数（纯函数）：求和。
 *
 * @param records 内镜检查量记录列表
 * @returns 胃镜月度例数
 */
export function computeGastroscopyCountV13(records: EndoscopyVolumeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.gastroscopyCount, 0);
}

/**
 * 肠镜月度例数（纯函数）：求和。
 *
 * @param records 内镜检查量记录列表
 * @returns 肠镜月度例数
 */
export function computeColonoscopyCountV13(records: EndoscopyVolumeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.colonoscopyCount, 0);
}

/**
 * 支气管镜月度例数（纯函数）：求和。
 *
 * @param records 内镜检查量记录列表
 * @returns 支气管镜月度例数
 */
export function computeBronchoscopyCountV13(records: EndoscopyVolumeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.bronchoscopyCount, 0);
}
