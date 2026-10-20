/**
 * 健澜科技 jlmedaios - 处方点评管理看板 API（M502）
 * 对接 BFF /api/v1/prescription/* ：
 *   /prescription/review   点评记录
 *   /prescription/feedback 问题反馈
 *   /prescription/stats    处方统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ReviewRow {
  id: string;
  dept: string;
  doctor: string;
  rxType: 'ordinary' | 'emergency' | 'pediatric' | 'anesthesia';
  result: 'rational' | 'irrational' | 'inappropriate';
  demo?: boolean;
}

export interface FeedbackRow {
  id: string;
  issue: 'indication' | 'drugChoice' | 'dosage' | 'combination';
  requirement: string;
  feedbackAt: string;
  demo?: boolean;
}

export interface RxStats {
  totalReviewed: number;
  rationalRate: number; // %
  irrationalCount: number;
  keyDrugRatio: number; // %
  demo?: boolean;
}

const DEMO_REVIEW: ReviewRow[] = [
  { id: 'rv-1', dept: '呼吸内科', doctor: '王**', rxType: 'ordinary', result: 'rational', demo: true },
  { id: 'rv-2', dept: '急诊科', doctor: '李**', rxType: 'emergency', result: 'inappropriate', demo: true },
  { id: 'rv-3', dept: '儿科', doctor: '赵**', rxType: 'pediatric', result: 'irrational', demo: true },
  { id: 'rv-4', dept: '麻醉科', doctor: '陈**', rxType: 'anesthesia', result: 'rational', demo: true },
  { id: 'rv-5', dept: '心内科', doctor: '周**', rxType: 'ordinary', result: 'inappropriate', demo: true },
];

const DEMO_FEEDBACK: FeedbackRow[] = [
  { id: 'fb-1', issue: 'indication', requirement: '严格掌握适应症，无指征停用', feedbackAt: '2026-10-15', demo: true },
  { id: 'fb-2', issue: 'drugChoice', requirement: '优先选用国家集采中选药品', feedbackAt: '2026-10-12', demo: true },
  { id: 'fb-3', issue: 'dosage', requirement: '调整剂量至说明书范围', feedbackAt: '2026-10-10', demo: true },
  { id: 'fb-4', issue: 'combination', requirement: '避免重复用药与不良相互作用', feedbackAt: '2026-10-08', demo: true },
];

const DEMO_STATS: RxStats = {
  totalReviewed: 1280,
  rationalRate: 92.5,
  irrationalCount: 96,
  keyDrugRatio: 18.4,
  demo: true,
};

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchReview = () => safeGet<ReviewRow>('/prescription/review', DEMO_REVIEW);
export const fetchFeedback = () => safeGet<FeedbackRow>('/prescription/feedback', DEMO_FEEDBACK);
export const fetchStats = () => safeGetSingle<RxStats>('/prescription/stats', DEMO_STATS);
