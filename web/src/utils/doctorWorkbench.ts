/**
 * 健澜科技 jlmedaios - 医生站工作台展示工具（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import type { RiskLevel } from '@/types/doctorWorkbench';

export const RISK_COLOR: Record<RiskLevel, string> = {
  red: 'red',
  yellow: 'orange',
  green: 'green',
};

export function riskTag(risk: RiskLevel): string {
  return RISK_COLOR[risk];
}
