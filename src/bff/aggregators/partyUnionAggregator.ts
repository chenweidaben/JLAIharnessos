/**
 * 健澜科技 jlmedaios - 党建工会管理聚合器（M140-D · 医院管理深化）
 *
 * 【医院管理深化】党建工会活动留痕：
 *   党支部学习 / 主题党日 / 工会福利 / 职工文体 / 志愿服务。
 * 核心诉求「活动留痕，方便上级检查」：每一场活动的类型、主题、组织者、
 *   日期、地点、参与人员全部登记在案，一查到底、一数溯源。
 *
 * 与全仓聚合器约定一致：
 *   - 对外函数核心为组包/统计，入参不被回改；
 *   - 进程内台账 Map 是活动列表与年度报告的在读索引；
 *     PostgreSQL 为持久化留痕，落库 best-effort（断库/表未迁移降级，不阻断主流程）。
 *
 * 不触碰 WebSocket，不新增依赖（id 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 活动类型：与 clinical.party_activity.type CHECK 一致（中文直存，检查所见即所查） */
export type PartyActivityType = '党支部学习' | '主题党日' | '工会福利' | '职工文体' | '志愿服务';

/** 党建工会活动（BFF 对外形态，camelCase） */
export interface PartyActivity {
  /** 活动唯一标识 */
  id: string;
  /** 活动类型 */
  type: PartyActivityType;
  /** 活动主题标题 */
  title: string;
  /** 组织者（= iam.users.id），组织责任留痕 */
  organizerId: string;
  /** 活动实际发生日期（YYYY-MM-DD） */
  date: string;
  /** 活动地点 */
  location: string;
  /** 参与人员留痕名单 */
  participants: string[];
  /** 参与人次（= participants.length） */
  participantCount: number;
  /** 登记留痕时间 ISO */
  createdAt: string;
}

/** 年度活动报告（上级检查 / 年终总结用） */
export interface AnnualActivityReport {
  /** 报告年份 */
  year: number;
  /** 全年活动场次 */
  totalActivities: number;
  /** 全年参与人次合计 */
  totalParticipants: number;
  /** 分类型场次（五类全覆盖，缺省 0） */
  byType: Record<PartyActivityType, number>;
  /** 分类型参与人次 */
  byTypeParticipants: Record<PartyActivityType, number>;
  /** 按月分布（index 0=1月 … 11=12月） */
  monthly: number[];
  /** 当年活动明细（按活动日期倒序） */
  activities: PartyActivity[];
}

/* ------------------------------------------------------------------ */
/* 进程内活动台账（列表与年度报告的在读索引）                            */
/* ------------------------------------------------------------------ */

const ledger = new Map<string, PartyActivity>();

/** 合法活动类型全集 */
export const PARTY_ACTIVITY_TYPES: readonly PartyActivityType[] = [
  '党支部学习',
  '主题党日',
  '工会福利',
  '职工文体',
  '志愿服务',
];

/** 五类空报告骨架（缺年/空表时也返回完整结构，前端不做缺省兜底） */
function emptyByType(): Record<PartyActivityType, number> {
  return {
    党支部学习: 0,
    主题党日: 0,
    工会福利: 0,
    职工文体: 0,
    志愿服务: 0,
  };
}

/** 校验并规范化活动日期：必须为 YYYY-MM-DD 真实日历日期 */
function normalizeDate(date: string): string {
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`活动日期 date 必须为 YYYY-MM-DD，收到 ${String(date)}`);
  }
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
    throw new Error(`活动日期 date 非法：${date}`);
  }
  return date;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【医院管理深化】登记一场党建工会活动（活动留痕第一入口）。
 *
 * 组包规则：
 *   - type 必须为五类活动之一；title 不能为空；organizerId 不能为空；
 *   - date 必须为合法 YYYY-MM-DD；location 缺省 ''；
 *   - participants 逐串 trim 并滤空，participantCount 即留痕人数；
 *   - 入参不被回改（参与者数组复制后入台账）。
 *
 * 入参不合法时抛错，由路由层收敛为 400。
 */
export function registerPartyActivity(
  type: PartyActivityType,
  title: string,
  organizerId: string,
  date: string,
  location: string,
  participants: string[],
): PartyActivity {
  if (!PARTY_ACTIVITY_TYPES.includes(type)) {
    throw new Error(`非法活动类型 type=${String(type)}，须为 ${PARTY_ACTIVITY_TYPES.join(' / ')} 之一`);
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('活动标题 title 不能为空');
  }
  if (!organizerId || typeof organizerId !== 'string') {
    throw new Error('组织者 organizerId 不能为空');
  }
  const normDate = normalizeDate(date);
  if (!Array.isArray(participants)) {
    throw new Error('参与者 participants 必须为字符串数组');
  }

  // 参与者留痕：逐人 trim、滤空串；不回改调用方数组
  const roster = participants
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const activity: PartyActivity = {
    id: randomUUID(),
    type,
    title: title.trim(),
    organizerId,
    date: normDate,
    location: typeof location === 'string' ? location.trim() : '',
    participants: roster,
    participantCount: roster.length,
    createdAt: new Date().toISOString(),
  };

  ledger.set(activity.id, activity);
  return activity;
}

/**
 * 【医院管理深化】年度活动报告（上级检查 / 年终总结）。
 *
 * 按活动日期 date 的年份切片，统计：
 *   - 全年场次 totalActivities、参与人次 totalParticipants；
 *   - 分类型场次 byType 与分类型人次 byTypeParticipants（五类全覆盖）；
 *   - 按月分布 monthly（1-12 月）；
 *   - 当年活动明细 activities（日期倒序）。
 *
 * 不修改台账；返回副本明细，调用方无法借此篡改留痕。
 */
export function getAnnualActivityReport(year: number): AnnualActivityReport {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error(`报告年份 year 必须为 2000-2100 之间的整数，收到 ${String(year)}`);
  }

  const byType = emptyByType();
  const byTypeParticipants = emptyByType();
  const monthly = new Array<number>(12).fill(0);
  const activities: PartyActivity[] = [];

  for (const a of ledger.values()) {
    if (!a.date.startsWith(`${y}-`)) continue;
    activities.push({ ...a, participants: [...a.participants] });
    byType[a.type] += 1;
    byTypeParticipants[a.type] += a.participantCount;
    const month = Number(a.date.slice(5, 7));
    if (month >= 1 && month <= 12) monthly[month - 1] += 1;
  }

  // 明细按活动日期倒序（最近一场在前，检查翻页即见新）
  activities.sort((x, z) => z.date.localeCompare(x.date));

  return {
    year: y,
    totalActivities: activities.length,
    totalParticipants: activities.reduce((sum, a) => sum + a.participantCount, 0),
    byType,
    byTypeParticipants,
    monthly,
    activities,
  };
}

/**
 * 【医院管理深化】活动台账列表（全量留痕）。
 * 返回副本，按活动日期倒序；供 GET 路由与页面列表使用。
 */
export function listPartyActivities(): PartyActivity[] {
  const out: PartyActivity[] = [];
  for (const a of ledger.values()) {
    out.push({ ...a, participants: [...a.participants] });
  }
  out.sort((x, z) => z.date.localeCompare(x.date));
  return out;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断                */
/* ------------------------------------------------------------------ */

/**
 * 把活动留痕落库到 clinical.party_activity。
 * 由路由层在登记后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可支撑列表与年度报告。
 */
export async function persistPartyActivity(activity: PartyActivity): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.party_activity
        (id, type, title, organizer_id, activity_date,
         location, participants, participant_count, created_at)
      VALUES
        (${activity.id}, ${activity.type}, ${activity.title}, ${activity.organizerId},
         ${activity.date}::date,
         ${activity.location}, ${JSON.stringify(activity.participants)}::jsonb,
         ${activity.participantCount}, ${activity.createdAt}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可用，落库留待重连后补写
  }
}
