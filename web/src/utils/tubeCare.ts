/**
 * 健澜科技 jlmedaios - 管路护理前端 utils（M17-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { RemovalType, TubeType } from '@/types/tubeCare';

const TUBE_LABEL: Record<TubeType, string> = {
  cvc: '中心静脉导管(CVC)',
  arterial_line: '动脉留置线',
  urinary_catheter: '留置导尿',
  ng_tube: '鼻胃管',
  feeding_tube: '肠内营养管',
  chest_drain: '胸腔引流管',
  abdominal_drain: '腹腔引流管',
  other: '其他管路',
};

const HIGH_RISK: ReadonlySet<TubeType> = new Set<TubeType>(['cvc', 'arterial_line']);

export function tubeTypeLabel(t: TubeType): string {
  return TUBE_LABEL[t] ?? t;
}

export function isHighRiskTube(t: TubeType): boolean {
  return HIGH_RISK.has(t);
}

export function removalTypeLabel(r: RemovalType | null): string {
  if (r === 'planned') return '计划拔管';
  if (r === 'unplanned') return '非计划拔管';
  return '—';
}

export function tubeStatusLabel(s: string): string {
  return s === 'in_place' ? '在管' : s === 'removed' ? '已拔除' : s;
}
