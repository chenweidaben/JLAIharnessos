/**
 * 健澜科技 jlmedaios - STOP-BANG 睡眠呼吸暂停筛查纯函数（M59-A）
 *
 * 8 项 yes/no 各计 1 分；>=3 高风险需睡眠监测。纯函数无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface StopBangAnswers {
  sSnoring: boolean;
  tTired: boolean;
  oObserved: boolean;
  pPressure: boolean;
  bBmi: boolean;
  aAge: boolean;
  nNeck: boolean;
  gGender: boolean;
}

/** 8 项打分为 0~8。 */
export function calcScore(a: StopBangAnswers): number {
  return [
    a.sSnoring, a.tTired, a.oObserved, a.pPressure,
    a.bBmi, a.aAge, a.nNeck, a.gGender,
  ].filter(Boolean).length;
}

/** >=3 高风险。 */
export function riskLevel(score: number): 'low' | 'high' {
  return score >= 3 ? 'high' : 'low';
}

/** >=3 建议睡眠监测。 */
export function needsSleepStudy(score: number): boolean {
  return score >= 3;
}
