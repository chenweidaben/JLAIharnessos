/**
 * 健澜科技 jlmedaios - STOP-BANG 展示工具（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import type { RiskLevel } from '@/types/stopbang';

export const ITEMS: { key: string; label: string }[] = [
  { key: 'sSnoring', label: 'S 响亮打鼾' },
  { key: 'tTired', label: 'T 白天疲倦' },
  { key: 'oObserved', label: 'O 观察到呼吸暂停' },
  { key: 'pPressure', label: 'P 高血压' },
  { key: 'bBmi', label: 'B BMI>35' },
  { key: 'aAge', label: 'A 年龄>50' },
  { key: 'nNeck', label: 'N 颈围>40cm' },
  { key: 'gGender', label: 'G 男性' },
];

export const RISK_LABEL: Record<RiskLevel, string> = { low: '低风险', high: '高风险' };
export const RISK_COLOR: Record<RiskLevel, string> = { low: 'green', high: 'red' };
