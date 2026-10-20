/**
 * 健澜科技 jlmedaios - 志愿服务管理看板 API（M504）
 * 对接 BFF /api/v1/volunteer/* ：
 *   /volunteer/team   志愿队伍
 *   /volunteer/activity 志愿活动
 *   /volunteer/stats  志愿统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface TeamRow {
  id: string;
  name: string;
  dept: string;
  count: number;
  leader: string;
  demo?: boolean;
}

export interface ActivityRow {
  id: string;
  name: string;
  time: string;
  location: string;
  hours: number;
  participants: number;
  demo?: boolean;
}

export interface VolunteerStats {
  registered: number;
  totalHours: number;
  avgHours: number;
  servedCount: number;
  demo?: boolean;
}

const DEMO_TEAMS: TeamRow[] = [
  { id: 'tm-1', name: '门诊导诊志愿队', dept: '门诊部', count: 42, leader: '王**', demo: true },
  { id: 'tm-2', name: '病房陪伴志愿队', dept: '护理部', count: 28, leader: '李**', demo: true },
  { id: 'tm-3', name: '安宁疗护志愿队', dept: '姑息医学科', count: 16, leader: '赵**', demo: true },
];

const DEMO_ACTIVITIES: ActivityRow[] = [
  { id: 'ac-1', name: '重阳节敬老义诊', time: '2026-10-14 08:00', location: '门诊大厅', hours: 6, participants: 24, demo: true },
  { id: 'ac-2', name: '门诊自助机引导', time: '2026-10-19 09:00', location: '门诊 1-3 层', hours: 4, participants: 12, demo: true },
  { id: 'ac-3', name: '病房读书陪伴', time: '2026-10-18 14:00', location: '老年病房', hours: 8, participants: 8, demo: true },
];

const DEMO_STATS: VolunteerStats = {
  registered: 286,
  totalHours: 1840,
  avgHours: 6.4,
  servedCount: 4260,
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

export const fetchTeam = () => safeGet<TeamRow>('/volunteer/team', DEMO_TEAMS);
export const fetchActivity = () => safeGet<ActivityRow>('/volunteer/activity', DEMO_ACTIVITIES);
export const fetchStats = () => safeGetSingle<VolunteerStats>('/volunteer/stats', DEMO_STATS);
