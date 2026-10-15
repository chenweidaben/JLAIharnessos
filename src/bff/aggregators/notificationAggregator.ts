/**
 * 健澜科技 jlmedaios - 医护统一消息通知中心聚合器（M134-C · 用户体验深化）
 *
 * 理念：不要太吵，重要通知才推送。
 *   全站站内消息统一收口到 clinical.notifications 一张表，四类来源：
 *     todo_task        待办任务
 *     system_alert     系统告警
 *     experience_rec   经验推荐
 *     peer_interact    同事互动
 *
 * 设计要点（与全仓聚合器约定一致）：
 *  - sendNotification / isUnread / filterNotifications / paginateNotifications
 *    均为纯函数：不打库、不修改入参，便于单测与前端本地复用；
 *  - insertNotification / listNotifications / markNotificationRead 为薄持久化层，
 *    断库 / 表未迁移时降级处理，不向上抛 5xx；
 *  - 越权防护在路由层强制 staff_id = 当前登录用户，本层不做鉴权。
 *
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 通知类型枚举（与 clinical.notifications.type CHECK 约束一致） */
export type NotificationType =
  | 'todo_task'
  | 'system_alert'
  | 'experience_rec'
  | 'peer_interact';

/** 统一消息通知（BFF 对外形态，camelCase） */
export interface Notification {
  /** 通知唯一标识 */
  id: string;
  /** 接收人 staff_id（= iam.users.id） */
  staffId: string;
  /** 通知类型 */
  type: NotificationType;
  /** 一句话标题 */
  title: string;
  /** 正文摘要 */
  content: string;
  /** 点击跳转的站内路由，可空 */
  link: string | null;
  /** 已读时间 ISO 串；null = 未读 */
  readAt: string | null;
  /** 创建时间 ISO 串 */
  createdAt: string;
}

/** 列表查询参数 */
export interface NotificationQuery {
  /** 按类型筛选；缺省 = 全部 */
  type?: NotificationType;
  /** true = 只看未读 */
  unreadOnly?: boolean;
  /** 页码，从 1 起 */
  page?: number;
  /** 每页条数，默认 20，上限 100 */
  pageSize?: number;
}

/** 列表视图 */
export interface NotificationListView {
  items: Notification[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
}

/* ------------------------------------------------------------------ */
/* 纯函数：构造 / 已读判断 / 筛选 / 分页                                  */
/* ------------------------------------------------------------------ */

/** 合法类型全集 */
export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'todo_task',
  'system_alert',
  'experience_rec',
  'peer_interact',
];

/** 任意值收敛为合法通知类型，越界回退 system_alert（安全默认：可见、不静默丢） */
function asType(v: unknown): NotificationType {
  return NOTIFICATION_TYPES.includes(v as NotificationType)
    ? (v as NotificationType)
    : 'system_alert';
}

/** 任意值 trim 为字符串，null/undefined 回退空串 */
function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 任意值收敛为可空 link：空串归一为 null */
function asLink(v: unknown): string | null {
  const s = asStr(v);
  return s.length > 0 ? s : null;
}

/**
 * sendNotification：构造一条「未读」通知（纯函数，不打库）。
 *
 * 业务侧产生消息时先调用本函数拿到结构合法的 Notification，
 * 再由 insertNotification 落库——构造与持久化分离，便于单测。
 *
 * 规则：
 *  - staffId / title 去空白后必填，缺失直接抛错（调用方编程错误，不应静默）；
 *  - type 越界回退 system_alert；content 缺省空串；link 空串归一为 null；
 *  - id 由 crypto.randomUUID() 生成；readAt 恒为 null（新通知必未读）；
 *  - createdAt 取当前时间 ISO 串。
 *
 * @throws {Error} staffId 或 title 为空时抛出
 */
export function sendNotification(
  staffId: string,
  type: string,
  title: string,
  content?: string,
  link?: string,
): Notification {
  const sid = asStr(staffId);
  const ttl = asStr(title);
  if (!sid) throw new Error('sendNotification: staffId 不能为空');
  if (!ttl) throw new Error('sendNotification: title 不能为空');

  return {
    id: crypto.randomUUID(),
    staffId: sid,
    type: asType(type),
    title: ttl,
    content: asStr(content),
    link: asLink(link),
    readAt: null,
    createdAt: new Date().toISOString(),
  };
}

/** 是否已读：readAt 非空即已读 */
export function isUnread(n: Pick<Notification, 'readAt'>): boolean {
  return n.readAt == null;
}

/**
 * filterNotifications：按类型 / 未读筛选（纯函数，不修改入参）。
 * 缺省参数不过滤；type 非法时等同于「不按类型过滤」。
 */
export function filterNotifications(
  items: Notification[],
  cond: { type?: NotificationType; unreadOnly?: boolean } = {},
): Notification[] {
  const wantType = cond.type;
  const wantUnread = cond.unreadOnly === true;
  return items.filter((n) => {
    if (wantType && n.type !== wantType) return false;
    if (wantUnread && !isUnread(n)) return false;
    return true;
  });
}

/**
 * paginateNotifications：内存分页（纯函数）。
 * page 从 1 起；非法页码 / 条数收敛为安全默认；返回当前页切片与总条数。
 */
export function paginateNotifications(
  items: Notification[],
  page?: number,
  pageSize?: number,
): { items: Notification[]; total: number; page: number; pageSize: number } {
  const size =
    typeof pageSize === 'number' && Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 100)
      : 20;
  const p =
    typeof page === 'number' && Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1;
  const start = (p - 1) * size;
  return {
    items: items.slice(start, start + size),
    total: items.length,
    page: p,
    pageSize: size,
  };
}

/* ------------------------------------------------------------------ */
/* 薄持久化层（断库降级，不抛 5xx）                                       */
/* ------------------------------------------------------------------ */

/** clinical.notifications 行（postgres.js 返回形态） */
interface NotificationDbRow {
  id: string;
  staff_id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  read_at: string | Date | null;
  created_at: string | Date;
}

function asIso(v: string | Date | null): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : v;
}

function rowToNotification(r: NotificationDbRow): Notification {
  return {
    id: r.id,
    staffId: r.staff_id,
    type: r.type as NotificationType,
    title: r.title,
    content: r.content ?? '',
    link: r.link ?? null,
    readAt: asIso(r.read_at),
    createdAt: asIso(r.created_at) ?? new Date().toISOString(),
  };
}

/**
 * insertNotification：把 sendNotification 构造好的通知落库。
 * 业务侧用法：const n = sendNotification(...); await insertNotification(n);
 */
export async function insertNotification(n: Notification): Promise<void> {
  await getDb()`
    INSERT INTO clinical.notifications
      (id, staff_id, type, title, content, link, read_at, created_at)
    VALUES
      ( ${n.id}::uuid, ${n.staffId}::uuid, ${n.type}, ${n.title},
        ${n.content}, ${n.link}, ${n.readAt}, ${n.createdAt}::timestamptz )
  `;
}

/**
 * listNotifications：拉取某接收人的通知列表（按 created_at 倒序）。
 * 支持 type / unreadOnly 筛选与 page/pageSize 分页，并附带未读总数。
 * 降级口径：表未迁移 / 断库时返回空列表，不抛错。
 */
export async function listNotifications(
  staffId: string,
  query: NotificationQuery = {},
): Promise<NotificationListView> {
  const page =
    typeof query.page === 'number' && query.page > 0 ? Math.floor(query.page) : 1;
  const pageSize =
    typeof query.pageSize === 'number' && query.pageSize > 0
      ? Math.min(Math.floor(query.pageSize), 100)
      : 20;
  const offset = (page - 1) * pageSize;

  try {
    // 未读总数（不受筛选 / 分页影响，供铃铛角标）
    const unreadRows = await getDb()<{ count: string | number }[]>`
      SELECT COUNT(*)::int AS count
      FROM clinical.notifications
      WHERE staff_id = ${staffId}::uuid AND read_at IS NULL
    `;
    const unread = Number(unreadRows[0]?.count ?? 0);

    // 列表：按类型 / 未读筛选（参数化布尔条件，不拼动态片段，防注入）
    //   typeFilter 为 null 时条件恒真 → 不按类型过滤；
    //   unreadOnly 为 false 时条件恒真 → 不限制未读。
    const typeFilter = query.type ?? null;
    const unreadOnly = query.unreadOnly === true;
    const rows = await getDb()<NotificationDbRow[]>`
      SELECT id, staff_id, type, title, content, link, read_at, created_at
      FROM clinical.notifications
      WHERE staff_id = ${staffId}::uuid
        AND (${typeFilter}::text IS NULL OR type = ${typeFilter})
        AND (${unreadOnly}::boolean = false OR read_at IS NULL)
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // 总数（受筛选影响，供前端分页器）
    const totalRows = await getDb()<{ count: string | number }[]>`
      SELECT COUNT(*)::int AS count
      FROM clinical.notifications
      WHERE staff_id = ${staffId}::uuid
        AND (${typeFilter}::text IS NULL OR type = ${typeFilter})
        AND (${unreadOnly}::boolean = false OR read_at IS NULL)
    `;
    const total = Number(totalRows[0]?.count ?? 0);

    return {
      items: rows.map(rowToNotification),
      total,
      unread,
      page,
      pageSize,
    };
  } catch (e) {
    console.warn('[notifications] 列表读取失败，降级为空列表:', e instanceof Error ? e.message : e);
    return { items: [], total: 0, unread: 0, page, pageSize };
  }
}

/**
 * markNotificationRead：把某人的某条通知置为已读。
 * 同时限定 staff_id = 接收人，越权改他人通知影响 0 行 → 返回 false。
 * 已读不回退：read_at 仅在仍为 NULL 时写入。
 */
export async function markNotificationRead(
  staffId: string,
  id: string,
): Promise<Notification | null> {
  try {
    const rows = await getDb()<NotificationDbRow[]>`
      UPDATE clinical.notifications
      SET read_at = now()
      WHERE id = ${id}::uuid
        AND staff_id = ${staffId}::uuid
        AND read_at IS NULL
      RETURNING id, staff_id, type, title, content, link, read_at, created_at
    `;
    const row = rows[0];
    return row ? rowToNotification(row) : null;
  } catch (e) {
    console.warn('[notifications] 已读标记失败:', e instanceof Error ? e.message : e);
    return null;
  }
}
