/**
 * 健澜科技 jlmedaios - 个人智能体训练数据沉淀 V13 纯函数（M319-D）
 *
 * countTrainingSamplesV13 / computeSuccessFailureRatioV13 / buildTrainingFlywheelV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 训练记录 */
export interface TrainingRecordV13 {
  recordId: string;
  doctorId: string;
  week: string;
  isSuccess: boolean;
}

/** 飞轮趋势点 */
export interface FlywheelPointV13 {
  week: string;
  cumulativeSamples: number;
}

/**
 * 累计训练样本量（纯函数）：成功+失败案例总数。
 *
 * @param records 训练记录列表
 * @returns 样本总量
 */
export function countTrainingSamplesV13(records: TrainingRecordV13[]): number {
  return records.length;
}

/**
 * 成功率（纯函数）：成功案例数/总案例数×100。
 *
 * @param records 训练记录列表
 * @returns 成功率百分比
 */
export function computeSuccessFailureRatioV13(records: TrainingRecordV13[]): number {
  if (records.length === 0) return 0;
  const success = records.filter((r) => r.isSuccess).length;
  return Math.round((success / records.length) * 100);
}

/**
 * 飞轮可视化数据（纯函数）：按周累计样本量趋势。
 *
 * @param records 训练记录列表
 * @returns 按周累计样本量趋势
 */
export function buildTrainingFlywheelV13(records: TrainingRecordV13[]): FlywheelPointV13[] {
  const weeks = [...new Set(records.map((r) => r.week))].sort();
  let cumulative = 0;
  return weeks.map((week) => {
    cumulative += records.filter((r) => r.week === week).length;
    return { week, cumulativeSamples: cumulative };
  });
}
