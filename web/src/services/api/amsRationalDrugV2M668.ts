/**
 * 健澜科技 jlmedaios - AMS 合理用药 v2 API（M668，配套 M563）
 *
 * 对接 BFF：GET /api/v1/ams/reviews
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AmsResult = 'reasonable' | 'irrational' | 'pending';

export interface AmsReview {
  id: string;
  patientId: string;
  dept: string;
  drugName: string;
  ddd: number;
  pathogen?: string;
  result: AmsResult;
  comment: string;
  reviewedAt: string;
  pharmacist: string;
}

export const AMS_RESULT_META: Record<AmsResult, { label: string; color: string }> = {
  reasonable: { label: '合理', color: 'green' },
  irrational: { label: '不合理', color: 'red' },
  pending: { label: '待点评', color: 'orange' },
};

const DEMO_AMS: AmsReview[] = [
  { id: 'AMS-001', patientId: 'P10001', dept: '呼吸科', drugName: '头孢哌酮舒巴坦 3.0g q8h', ddd: 6.0, pathogen: '肺炎克雷伯菌（ESBL+）', result: 'reasonable', comment: '药敏支持，DDD 6.0 在合理范围。', reviewedAt: '2026-10-22T09:00:00+08:00', pharmacist: '李药师' },
  { id: 'AMS-002', patientId: 'P10005', dept: '心内科', drugName: '莫西沙星 0.4g qd', ddd: 1.0, result: 'irrational', comment: '无细菌感染证据，预防用药超 48h。', reviewedAt: '2026-10-22T10:00:00+08:00', pharmacist: '赵主任' },
  { id: 'AMS-003', patientId: 'P10008', dept: '普外科', drugName: '万古霉素 1.0g q12h', ddd: 2.0, pathogen: 'MRSA', result: 'pending', comment: '', reviewedAt: '', pharmacist: '' },
];

export interface AmsListResult {
  items: AmsReview[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAmsReviews(): Promise<AmsListResult> {
  try {
    const res = await get<{ items: AmsReview[]; totalCount: number }>('/ams/audits');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_AMS, totalCount: DEMO_AMS.length, demo: true };
  }
}
