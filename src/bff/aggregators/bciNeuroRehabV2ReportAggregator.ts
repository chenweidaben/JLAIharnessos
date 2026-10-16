/**
 * 健澜科技 jlmedaios - 脑机接口神经康复 V2 纯函数（M247-B）
 *
 * buildBCINeuroRehabV2Report / decodeEEGV2 / designNeuroRehabPlanV2
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 解码脑电 V2（纯函数）。
 *
 * @param eeg 脑电
 * @returns 解码
 */
export function decodeEEGV2(eeg: { channels: number; samples: number; accuracy: number }): { channels: number; accuracy: number; reliable: boolean } {
  return { channels: eeg.channels, accuracy: eeg.accuracy, reliable: eeg.accuracy >= 80 };
}

/**
 * 设计神经康复方案 V2（纯函数）。
 *
 * @param patient 患者
 * @param injury 损伤
 * @returns 方案
 */
export function designNeuroRehabPlanV2(patient: { name: string; age: number }, injury: { type: string; severity: number }): { patient: string; modality: string; sessions: number } {
  let modality = "常规康复";
  if (injury.type === "stroke" && injury.severity >= 3) modality = "BCI+外骨骼";
  else if (injury.type === "spinal" && injury.severity >= 2) modality = "FES+机器人";
  const sessions = Math.max(20, 40 - injury.severity * 5);
  return { patient: patient.name, modality, sessions };
}

/** 脑机接口 V2 报告输出 */
export interface BCINeuroRehabV2Report {
  timeRange: string;
  bci: { invasive: number; nonInvasive: number; decoding: number };
  stimulation: { tms: number; tdcs: number; dbs: number };
  robotics: { exoskeleton: number; hand: number; gait: number };
  suggestions: string[];
}

/**
 * 构建脑机接口 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 脑机接口 V2 报告
 */
export function buildBCINeuroRehabV2Report(timeRange: string): BCINeuroRehabV2Report {
  return {
    timeRange,
    bci: { invasive: 5, nonInvasive: 50, decoding: 85 },
    stimulation: { tms: 20, tdcs: 15, dbs: 3 },
    robotics: { exoskeleton: 10, hand: 8, gait: 12 },
    suggestions: ["提升 BCI 解码准确率", "扩大外骨骼康复覆盖"],
  };
}
