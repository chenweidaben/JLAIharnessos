/**
 * 健澜科技 jlmedaios - 患者健康教育看板 API（M496）
 * 对接 BFF /api/v1/health-edu/* ：
 *   /health-edu/materials  材料库
 *   /health-edu/activities 讲座活动
 *   /health-edu/coverage 宣教覆盖
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface MaterialRow {
  id: string;
  name: string;
  type: 'brochure' | 'video' | 'poster' | 'article';
  dept: string;
  views: number;
  updatedAt: string;
  demo?: boolean;
}

export interface ActivityRow {
  id: string;
  topic: string;
  dept: string;
  lecturer: string;
  attendees: number;
  time: string;
  demo?: boolean;
}

export interface CoverageRow {
  id: string;
  dept: string;
  inpatientRate: number; // %
  outpatientRate: number; // %
  satisfaction: number; // %
  demo?: boolean;
}

const DEMO_MATERIALS: MaterialRow[] = [
  { id: 'm-1', name: '高血压居家管理手册', type: 'brochure', dept: '心内科', views: 1820, updatedAt: '2026-09-15', demo: true },
  { id: 'm-2', name: '糖尿病饮食指导视频', type: 'video', dept: '内分泌科', views: 2640, updatedAt: '2026-09-20', demo: true },
  { id: 'm-3', name: '术前注意事项海报', type: 'poster', dept: '普外科', views: 960, updatedAt: '2026-09-10', demo: true },
  { id: 'm-4', name: '脑卒中康复训练文章', type: 'article', dept: '神经内科', views: 720, updatedAt: '2026-10-01', demo: true },
];

const DEMO_ACTIVITIES: ActivityRow[] = [
  { id: 'a-1', topic: '世界心脏病日健康讲座', dept: '心内科', lecturer: '王教授', attendees: 86, time: '2026-09-29 14:00', demo: true },
  { id: 'a-2', topic: '糖尿病自我管理小组', dept: '内分泌科', lecturer: '赵护士长', attendees: 32, time: '2026-10-08 10:00', demo: true },
  { id: 'a-3', topic: '孕产妇课堂', dept: '妇产科', lecturer: '李主任医师', attendees: 48, time: '2026-10-12 15:00', demo: true },
];

const DEMO_COVERAGE: CoverageRow[] = [
  { id: 'cv-1', dept: '心内科', inpatientRate: 96.5, outpatientRate: 88.2, satisfaction: 94.2, demo: true },
  { id: 'cv-2', dept: '普外科', inpatientRate: 92.8, outpatientRate: 78.5, satisfaction: 91.6, demo: true },
  { id: 'cv-3', dept: '神经内科', inpatientRate: 88.4, outpatientRate: 72.1, satisfaction: 89.5, demo: true },
  { id: 'cv-4', dept: '妇产科', inpatientRate: 98.2, outpatientRate: 92.4, satisfaction: 96.8, demo: true },
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

export const fetchMaterials = () =>
  safeGet<MaterialRow>('/health-edu/materials', DEMO_MATERIALS);
export const fetchActivities = () =>
  safeGet<ActivityRow>('/health-edu/activities', DEMO_ACTIVITIES);
export const fetchCoverage = () =>
  safeGet<CoverageRow>('/health-edu/coverage', DEMO_COVERAGE);
