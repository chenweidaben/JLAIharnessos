/**
 * 健澜科技 jlmedaios - 不良事件后结构化评估引擎（M17-D）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖。
 * 负责：跌倒后评估必填项校验、压疮事件分级映射、NQI 分子/分母汇总。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type PressureStage = 'pressure_injury_stage2' | 'pressure_injury_stage3' | 'pressure_injury_stage4';
export type EventType = 'pressure_injury_stage2' | 'pressure_injury_stage3' | 'pressure_injury_stage4' | 'fall';
export type RiskLevel = 'high' | 'medium' | 'low';

/** 压疮事件分级 -> 中文分级。 */
export function pressureStageLabel(stage: PressureStage): string {
  if (stage === 'pressure_injury_stage2') return '二期压力性损伤';
  if (stage === 'pressure_injury_stage3') return '三期压力性损伤';
  return '四期压力性损伤';
}

export function isValidPressureStage(v: string): v is PressureStage {
  return v === 'pressure_injury_stage2' || v === 'pressure_injury_stage3' || v === 'pressure_injury_stage4';
}

/** 跌倒后评估必填项（缺任一项即不合格）。 */
export interface FallReviewInput {
  occurredAt?: unknown;
  location?: string;
  circumstances?: string;
  injuries?: string;
  familyNotified?: boolean;
}

/** 返回缺失的必填字段名列表（空=通过）。 */
export function missingFallReviewFields(input: FallReviewInput): string[] {
  const missing: string[] = [];
  if (!input.occurredAt) missing.push('occurredAt');
  if (!input.location || !input.location.trim()) missing.push('location');
  if (!input.circumstances || !input.circumstances.trim()) missing.push('circumstances');
  if (!input.injuries || !input.injuries.trim()) missing.push('injuries');
  if (input.familyNotified === undefined || input.familyNotified === null) missing.push('familyNotified');
  return missing;
}

export interface EventRateRow {
  eventType: EventType;
}

export interface EventReviewMetrics {
  pressureInjuryRate: number;
  fallRate: number;
  fractions: {
    pressureInjury: { numerator: number; denominator: number };
    fall: { numerator: number; denominator: number };
  };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/**
 * NQI_PRESSURE_INJURY / NQI_FALL_INCIDENT：
 * 分母=周期内在院就诊数（由调用方传入）；分子=对应事件例数。
 */
export function computeEventRates(rows: EventRateRow[], inpatientVisits: number): EventReviewMetrics {
  const pressure = (rows ?? []).filter((r) => r.eventType.startsWith('pressure_injury_stage')).length;
  const fall = (rows ?? []).filter((r) => r.eventType === 'fall').length;
  return {
    pressureInjuryRate: pct(pressure, inpatientVisits),
    fallRate: pct(fall, inpatientVisits),
    fractions: {
      pressureInjury: { numerator: pressure, denominator: inpatientVisits },
      fall: { numerator: fall, denominator: inpatientVisits },
    },
  };
}
