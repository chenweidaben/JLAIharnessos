/**
 * 健澜科技 jlmedaios - 医德医风考评看板 API（M497）
 * 对接 BFF /api/v1/ethics/* ：
 *   /ethics/evaluation  年度考评
 *   /ethics/complaints  投诉核查
 *   /ethics/rewards     表彰奖励
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface EvaluationRow {
  id: string;
  dept: string;
  doctor: string;
  score: number;
  grade: 'excellent' | 'good' | 'average' | 'poor';
  demo?: boolean;
}

export interface ComplaintRow {
  id: string;
  content: string;
  accused: string;
  conclusion: 'confirmed' | 'unfounded' | 'under_review';
  result: string;
  demo?: boolean;
}

export interface RewardRow {
  id: string;
  name: string;
  recipient: string;
  level: 'national' | 'provincial' | 'municipal' | 'hospital';
  time: string;
  demo?: boolean;
}

const DEMO_EVAL: EvaluationRow[] = [
  { id: 'e-1', dept: '心内科', doctor: '王**', score: 96, grade: 'excellent', demo: true },
  { id: 'e-2', dept: '普外科', doctor: '李**', score: 92, grade: 'good', demo: true },
  { id: 'e-3', dept: '神经内科', doctor: '赵**', score: 85, grade: 'average', demo: true },
  { id: 'e-4', dept: '急诊科', doctor: '陈**', score: 76, grade: 'poor', demo: true },
  { id: 'e-5', dept: '妇产科', doctor: '周**', score: 98, grade: 'excellent', demo: true },
];

const DEMO_COMPLAINTS: ComplaintRow[] = [
  { id: 'cp-1', content: '候诊时间过长', accused: '分诊护士-钱**', conclusion: 'confirmed', result: '通报批评+流程整改', demo: true },
  { id: 'cp-2', content: '检查结果解释不清', accused: '放射科-孙**', conclusion: 'unfounded', result: '已当面沟通说明', demo: true },
  { id: 'cp-3', content: '服务态度问题', accused: '门诊药房-吴**', conclusion: 'under_review', result: '核查中', demo: true },
];

const DEMO_REWARDS: RewardRow[] = [
  { id: 'r-1', name: '全国先进工作者', recipient: '王**', level: 'national', time: '2026-04-28', demo: true },
  { id: 'r-2', name: '省级青年科技奖', recipient: '李**', level: 'provincial', time: '2026-08-15', demo: true },
  { id: 'r-3', name: '市级医德标兵', recipient: '赵**', level: 'municipal', time: '2026-09-10', demo: true },
  { id: 'r-4', name: '院级优秀医师', recipient: '周**', level: 'hospital', time: '2026-08-19', demo: true },
];

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

export const fetchEvaluation = () =>
  safeGet<EvaluationRow>('/ethics/evaluation', DEMO_EVAL);
export const fetchComplaints = () =>
  safeGet<ComplaintRow>('/ethics/complaints', DEMO_COMPLAINTS);
export const fetchRewards = () =>
  safeGet<RewardRow>('/ethics/rewards', DEMO_REWARDS);
