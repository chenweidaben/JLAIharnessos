/**
 * 健澜科技 jlmedaios - 精神心理与睡眠医学纯函数（M202-B）
 *
 * buildPsychiatryReport / scoreDepressionSeverity / classifySleepDisorder
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * PHQ-9 抑郁严重程度评分（纯函数）。
 *
 * @param phq9 PHQ-9 总分（0-27）
 * @returns 严重程度
 */
export function scoreDepressionSeverity(phq9: number): { level: string; score: number } {
  let level = '无抑郁';
  if (phq9 >= 20) level = '重度抑郁';
  else if (phq9 >= 15) level = '中度抑郁';
  else if (phq9 >= 10) level = '轻度抑郁';
  else if (phq9 >= 5) level = '轻微抑郁';
  return { level, score: phq9 };
}

/** PSG 睡眠数据 */
export interface PSGData {
  sleepEfficiency: number;
  apneaIndex: number;
  remLatencyMin: number;
  totalSleepMin: number;
}

/**
 * 睡眠障碍分类（纯函数）。
 *
 * @param psg PSG 数据
 * @returns 分类
 */
export function classifySleepDisorder(psg: PSGData): { diagnosis: string; severity: string } {
  if (psg.apneaIndex >= 30) return { diagnosis: 'OSA 重度', severity: '重度' };
  if (psg.apneaIndex >= 15) return { diagnosis: 'OSA 中度', severity: '中度' };
  if (psg.apneaIndex >= 5) return { diagnosis: 'OSA 轻度', severity: '轻度' };
  if (psg.sleepEfficiency < 85) return { diagnosis: '失眠', severity: psg.sleepEfficiency < 70 ? '中度' : '轻度' };
  return { diagnosis: '正常睡眠', severity: '无' };
}

/** 精神心理报告输出 */
export interface PsychiatryReport {
  dept: string;
  timeRange: string;
  outpatient: { visits: number; newPatients: number };
  assessment: { phq9: number; gad7: number; mmse: number; moca: number };
  disorders: { mood: number; schizophrenia: number; anxiety: number };
  sleep: { psgStudies: number; osaPatients: number; insomniaPatients: number };
  special: { childPsych: number; geriatricPsych: number; crisisInterventions: number };
  outcomes: { followupRate: number };
  suggestions: string[];
}

/**
 * 构建精神心理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 精神心理报告
 */
export function buildPsychiatryReport(dept: string, timeRange: string): PsychiatryReport {
  return {
    dept,
    timeRange,
    outpatient: { visits: 3000, newPatients: 800 },
    assessment: { phq9: 1500, gad7: 1200, mmse: 500, moca: 400 },
    disorders: { mood: 600, schizophrenia: 200, anxiety: 800 },
    sleep: { psgStudies: 300, osaPatients: 150, insomniaPatients: 500 },
    special: { childPsych: 300, geriatricPsych: 200, crisisInterventions: 20 },
    outcomes: { followupRate: 0.75 },
    suggestions: ['加强儿童青少年心理干预', '推广睡眠监测 PSG'],
  };
}
