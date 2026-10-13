/**
 * 健澜科技 jlmedaios - 疼痛门诊（癌痛 NRS 滴定/爆发痛/镇痛方案建议）引擎（M52-A）
 *
 * 纯函数、确定性、无 I/O、无随机。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type TitrationResponse = 'good' | 'partial' | 'none';
export type RegimenSuggestion = 'escalate_dose' | 'switch_drug' | 'breakthrough_rescue' | 'continue';

function clampNrs(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(10, Math.max(0, Math.round(n)));
}

/**
 * 滴定响应：当前 NRS 相对基线下降。
 * 改善 ≥2 分 → good；改善 1 分 → partial；未改善 → none。
 */
export function titrationResponse(baselineNrs: number, currentNrs: number): TitrationResponse {
  const drop = clampNrs(baselineNrs) - clampNrs(currentNrs);
  if (drop >= 2) return 'good';
  if (drop === 1) return 'partial';
  return 'none';
}

/**
 * 是否需要升级镇痛：当前 NRS ≥7 或 24h 爆发痛 ≥3 次。
 */
export function needsEscalation(currentNrs: number, breakthroughCount: number): boolean {
  return clampNrs(currentNrs) >= 7 || (Number.isFinite(breakthroughCount) && breakthroughCount >= 3);
}

/**
 * 镇痛方案建议：
 *  - current ≥7 → 加量；
 *  - breakthrough ≥3（且 NRS <7）→ 加爆发痛解救药；
 *  - 1 ≤ current <7 且滴定响应 partial/none → 考虑换药；
 *  - 否则维持。
 */
export function suggestRegimen(
  currentNrs: number,
  breakthroughCount: number,
  baselineNrs?: number,
): RegimenSuggestion {
  const cur = clampNrs(currentNrs);
  const brk = Number.isFinite(breakthroughCount) ? breakthroughCount : 0;
  if (cur >= 7) return 'escalate_dose';
  if (brk >= 3) return 'breakthrough_rescue';
  if (baselineNrs !== undefined && cur >= 1 && titrationResponse(baselineNrs, cur) !== 'good') {
    return 'switch_drug';
  }
  return 'continue';
}
