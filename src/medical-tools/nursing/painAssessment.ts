/**
 * NRS 疼痛评估纯函数。
 * score 0-10：0-3 mild / 4-6 moderate / 7-10 severe；>=4 需镇痛。
 */

export type PainLevel = 'mild' | 'moderate' | 'severe';

export function painLevel(score: number): PainLevel {
  if (score <= 3) return 'mild';
  if (score <= 6) return 'moderate';
  return 'severe';
}

export function needAnalgesia(score: number): boolean {
  return score >= 4;
}

/** 术后/癌痛再评估间隔（小时）。 */
export function reassessIntervalHours(assessType: string, score: number): number {
  if (score >= 7) return 1;
  if (score >= 4) return 4;
  if (assessType === 'postop' || assessType === 'cancer') return 8;
  return 24;
}

export function advice(score: number, assessType: string): string {
  if (score >= 7) return '重度疼痛，建议立即通知医师并给予强镇痛';
  if (score >= 4) return '中度疼痛，建议通知医师评估镇痛方案';
  if (assessType === 'postop' || assessType === 'cancer') return '轻度疼痛，8h 内再评估';
  return '轻度疼痛，继续观察';
}
