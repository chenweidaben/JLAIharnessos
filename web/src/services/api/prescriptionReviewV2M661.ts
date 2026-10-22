/**
 * 健澜科技 jlmedaios - 处方点评 v2 API（M661，配套 M552）
 *
 * 对接 BFF：GET /api/v1/prescription/reviews
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReviewResult = 'reasonable' | 'irrational' | 'pending';
export type IrrationalType = 'none' | 'indication' | 'dose' | 'interaction' | 'duplicate' | 'allergen' | 'other';

export interface PrescriptionReview {
  id: string;
  prescriptionNo: string;
  patientId: string;
  prescriber: string;
  drugs: string[];
  reviewResult: ReviewResult;
  irrationalType: IrrationalType;
  comment: string;
  reviewedAt: string;
  reviewer: string;
}

export const REVIEW_RESULT_META: Record<ReviewResult, { label: string; color: string }> = {
  reasonable: { label: "合理", color: "green" },
  irrational: { label: "不合理", color: "red" },
  pending: { label: "待点评", color: "orange" },
};

export const IRRATIONAL_TYPE_META: Record<IrrationalType, { label: string; color: string }> = {
  none: { label: "—", color: "default" },
  indication: { label: "适应证不适宜", color: "orange" },
  dose: { label: "用法用量不适宜", color: "orange" },
  interaction: { label: "联合用药不适宜", color: "red" },
  duplicate: { label: "重复用药", color: "orange" },
  allergen: { label: "有配伍禁忌/过敏", color: "red" },
  other: { label: "其他", color: "default" },
};

const DEMO_REVIEWS: PrescriptionReview[] = [
  {
    id: "PR-001",
    prescriptionNo: "RX-2601",
    patientId: "P10001",
    prescriber: "王医师",
    drugs: ["阿莫西林胶囊 0.5g tid"],
    reviewResult: "reasonable",
    irrationalType: "none",
    comment: "无",
    reviewedAt: "2026-10-22T09:00:00+08:00",
    reviewer: "李药师",
  },
  {
    id: "PR-002",
    prescriptionNo: "RX-2602",
    patientId: "P10005",
    prescriber: "陈医师",
    drugs: ["华法林钠片 5mg qd", "阿司匹林 100mg qd", "布洛芬缓释胶囊 0.3g bid"],
    reviewResult: "irrational",
    irrationalType: "interaction",
    comment: "华法林 + 阿司匹林 + NSAID 出血风险叠加，建议停用布洛芬。",
    reviewedAt: "2026-10-22T10:00:00+08:00",
    reviewer: "赵主任",
  },
  {
    id: "PR-003",
    prescriptionNo: "RX-2603",
    patientId: "P10011",
    prescriber: "刘医师",
    drugs: ["氨溴索口服液 10ml tid"],
    reviewResult: "pending",
    irrationalType: "none",
    comment: "",
    reviewedAt: "",
    reviewer: "",
  },
];

export interface PrescriptionListResult {
  items: PrescriptionReview[];
  totalCount: number;
  demo: boolean;
}

export async function fetchPrescriptionReviews(): Promise<PrescriptionListResult> {
  try {
    const res = await get<{ items: PrescriptionReview[]; totalCount: number }>("/prescription/reviews");
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REVIEWS, totalCount: DEMO_REVIEWS.length, demo: true };
  }
}
