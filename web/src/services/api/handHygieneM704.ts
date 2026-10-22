/**
 * 健澜科技 jlmedaios - 手卫生依从性监测 API（M704）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface HandHygieneObservation {
  id: string;
  dept: string;
  observed: number;
  compliant: number;
  beforePatientContact: number;
  beforeAseptic: number;
  afterBodyFluid: number;
  afterPatientContact: number;
  afterSurrounding: number;
  feedback: string;
}

const rate = (o: Pick<HandHygieneObservation, 'observed' | 'compliant'>): number =>
  o.observed === 0 ? 0 : Math.round((o.compliant / o.observed) * 1000) / 10;

const rateMeta = (r: number): { color: string; label: string } =>
  r >= 95 ? { color: 'green', label: '达标（≥95%）' }
  : r >= 80 ? { color: 'orange', label: '待改进（80-95%）' }
  : { color: 'red', label: '不达标（<80%）' };

const DEMO: HandHygieneObservation[] = [
  {
    id: 'HH-001',
    dept: 'ICU',
    observed: 120,
    compliant: 114,
    beforePatientContact: 24,
    beforeAseptic: 22,
    afterBodyFluid: 22,
    afterPatientContact: 23,
    afterSurrounding: 23,
    feedback: '手卫生依从率 95%，已达标；继续保持。',
  },
  {
    id: 'HH-002',
    dept: '呼吸科',
    observed: 100,
    compliant: 78,
    beforePatientContact: 18,
    beforeAseptic: 12,
    afterBodyFluid: 18,
    afterPatientContact: 16,
    afterSurrounding: 14,
    feedback: '床旁速干手消剂配备不足，已整改补充。',
  },
];

export interface HandHygieneListResult {
  items: HandHygieneObservation[];
  demo: boolean;
}

export async function fetchHandHygieneObservations(): Promise<HandHygieneListResult> {
  try {
    const res = await get<{ items: HandHygieneObservation[] }>('/infection/hand-hygiene');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}

export { rate as handHygieneRate, rateMeta as handHygieneRateMeta };
