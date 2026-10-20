/**
 * 健澜科技 jlmedaios - 输血质控深度监控看板 API（M519）
 * 对接 BFF /api/v1/transfusion/* ：
 *   /transfusion/applications      输血申请
 *   /transfusion/adverse-reactions 不良反应
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * 严格按后端契约使用枚举/数值/布尔，不拼接中文标签。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ApplicationRow {
  id: string;
  patient: string;
  bloodType: 'A' | 'B' | 'O' | 'AB';
  rh: 'positive' | 'negative';
  component: 'RBC' | 'plasma' | 'platelet' | 'wholeBlood';
  dept: string;
  amount: string;
  diagnosis: string;
  demo?: boolean;
}

export interface ReactionRow {
  id: string;
  patient: string;
  reactionType: 'fever' | 'allergy' | 'hemolysis' | 'bacterial';
  occurredAt: string;
  severity: 'mild' | 'moderate' | 'severe';
  treatment: string;
  resolved: boolean;
  demo?: boolean;
}

const DEMO_APPLICATIONS: ApplicationRow[] = [
  { id: 'ap-1', patient: '张三', bloodType: 'A', rh: 'positive', component: 'RBC', dept: '普外科', amount: '2U', diagnosis: '术后贫血', demo: true },
  { id: 'ap-2', patient: '李四', bloodType: 'O', rh: 'negative', component: 'plasma', dept: 'ICU', amount: '400mL', diagnosis: '凝血功能障碍', demo: true },
  { id: 'ap-3', patient: '王五', bloodType: 'AB', rh: 'positive', component: 'platelet', dept: '血液科', amount: '1治疗量', diagnosis: '血小板减少', demo: true },
  { id: 'ap-4', patient: '赵六', bloodType: 'B', rh: 'positive', component: 'wholeBlood', dept: '急诊科', amount: '400mL', diagnosis: '失血性休克', demo: true },
];

const DEMO_REACTIONS: ReactionRow[] = [
  { id: 'rx-1', patient: '李四', reactionType: 'fever', occurredAt: '2026-10-20 09:30', severity: 'mild', treatment: '减慢滴速 + 物理降温', resolved: true, demo: true },
  { id: 'rx-2', patient: '王五', reactionType: 'allergy', occurredAt: '2026-10-20 11:15', severity: 'moderate', treatment: '静推地塞米松', resolved: true, demo: true },
  { id: 'rx-3', patient: '赵六', reactionType: 'hemolysis', occurredAt: '2026-10-20 14:00', severity: 'severe', treatment: '立即停止输血 + 抢救', resolved: false, demo: true },
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

export const fetchApplications = () => safeGet<ApplicationRow>('/transfusion/applications', DEMO_APPLICATIONS);
export const fetchAdverseReactions = () => safeGet<ReactionRow>('/transfusion/adverse-reactions', DEMO_REACTIONS);
