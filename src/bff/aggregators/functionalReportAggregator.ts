/**
 * 健澜科技 jlmedaios - 功能检查中心纯函数（M223-D）
 *
 * buildFunctionalReport / interpretECG / assessPulmonaryFunction
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 解读心电图（纯函数）。
 *
 * @param ecg 心率
 * @returns 诊断
 */
export function interpretECG(ecg: number): { normal: boolean; finding: string } {
  let finding = '正常心电图';
  if (ecg > 100) finding = '窦性心动过速';
  else if (ecg < 60) finding = '窦性心动过缓';
  return { normal: ecg >= 60 && ecg <= 100, finding };
}

/**
 * 评估肺功能（纯函数）。
 *
 * @param fev1 FEV1实测值
 * @param pred FEV1预计值
 * @returns 分级
 */
export function assessPulmonaryFunction(fev1: number, pred: number): { grade: string; ratio: number } {
  const ratio = pred > 0 ? Math.round((fev1 / pred) * 100) : 0;
  let grade = '正常';
  if (ratio < 50) grade = '极重度';
  else if (ratio < 70) grade = '重度';
  else if (ratio < 80) grade = '中度';
  else if (ratio < 90) grade = '轻度';
  return { grade, ratio };
}

/** 功能检查中心报告输出 */
export interface FunctionalReport {
  timeRange: string;
  ecg: { routine: number; holter: number; treadmill: number };
  abpm: { dynamic: number };
  pulmonary: { spirometry: number; sleep: number };
  endoscopy: { gastro: number; colon: number; bronchus: number };
  echo: { echocardiogram: number };
  neuro: { eeg: number; emg: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建功能检查中心报告。
 *
 * @param timeRange 时间范围
 * @returns 功能检查中心报告
 */
export function buildFunctionalReport(timeRange: string): FunctionalReport {
  return {
    timeRange,
    ecg: { routine: 30000, holter: 2000, treadmill: 500 },
    abpm: { dynamic: 1500 },
    pulmonary: { spirometry: 3000, sleep: 300 },
    endoscopy: { gastro: 8000, colon: 5000, bronchus: 1000 },
    echo: { echocardiogram: 6000 },
    neuro: { eeg: 800, emg: 400 },
    management: { satisfaction: 92 },
    suggestions: ['扩大胃肠镜检查', '加强睡眠监测'],
  };
}
