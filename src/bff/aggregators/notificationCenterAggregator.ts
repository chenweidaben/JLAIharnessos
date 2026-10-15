/**
 * 健澜科技 jlmedaios - 统一通知中心聚合器（M148-B · 产品化收尾）
 *
 * 产品理念：聚合通知，不能每个系统发一条。
 *   全院各业务系统不再各自推送一条独立消息，而是统一收口到医护本人的通知中心，
 *   按四大类聚合：
 *     todo       待办（新医嘱待审 / 新病历待签 / 新审批待批）
 *     alert      告警（危急值 / 院感 / 药品低库存）
 *     recommend  推荐（AI 推荐经验 / 学习材料）
 *     interact   互动（同事 @你 / 知识被引用）
 *
 * 设计要点（与全仓聚合器约定一致）：
 *  - pushNotification / getUnifiedNotifications / markNotificationRead 均为纯函数：
 *    不打库、不修改入参，便于单测与前端本地复用；
 *  - 通知仓为进程内内存表（Map<staffId, UnifiedNotification[]>），是 BFF 运行态；
 *    权威持久层见 deploy/postgres/init/301-notification-center.sql（clinical.unified_notification），
 *    后续接库时仅需把本层的读写替换为薄持久化层，路由与前端无需改动；
 *  - 越权防护在路由层强制 staff_id = 当前登录用户，本层按入参 staffId 隔离；
 *  - ref_type + ref_id 回指来源业务对象，点击可跳回原业务页面处理。
 *
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 通知大类枚举（与 clinical.unified_notification.type CHECK 约束一致） */
export type UnifiedNotificationType = 'todo' | 'alert' | 'recommend' | 'interact';

/** 统一通知（BFF 对外形态，camelCase） */
export interface UnifiedNotification {
  /** 通知唯一标识 */
  id: string;
  /** 接收人 staff_id（= iam.users.id） */
  staffId: string;
  /** 通知大类 */
  type: UnifiedNotificationType;
  /** 一句话标题 */
  title: string;
  /** 正文摘要 */
  content: string;
  /** 来源业务对象类型（order_review/record_sign/approval/critical_value/infection/
   *  low_stock/ai_experience/learning_material/mention/knowledge_cited …），可空 */
  refType: string | null;
  /** 来源业务对象主键，配合 refType 回跳原页面，可空 */
  refId: string | null;
  /** 已读时间 ISO 串；null = 未读 */
  readAt: string | null;
  /** 创建时间 ISO 串 */
  createdAt: string;
}

/** 分页视图 */
export interface Page<T> {
  /** 当前页条目 */
  items: T[];
  /** 受筛选影响的总条数（供前端分页器） */
  total: number;
  /** 该接收人未读总数（不受 type 筛选影响，供铃铛角标） */
  unread: number;
  /** 当前页码（从 1 起） */
  page: number;
  /** 每页条数 */
  pageSize: number;
}

/* ------------------------------------------------------------------ */
/* 进程内通知仓（运行态；持久层见 301-notification-center.sql）            */
/* ------------------------------------------------------------------ */

/** 仓内记录：对外形态 + 单调序号（仅用于同毫秒推送时的稳定倒序，不对外暴露） */
interface StoredNotification extends UnifiedNotification {
  _seq: number;
}

/** 全局单调序号：保证同一毫秒内多次推送仍按「最新在前」稳定排序 */
let seq = 0;

/** staffId → 该接收人的通知列表（按推送先后追加，读取时按 createdAt/_seq 倒序） */
const store = new Map<string, StoredNotification[]>();

/** 去掉内部 _seq，返回对外形态 */
function toPublic(n: StoredNotification): UnifiedNotification {
  return {
    id: n.id,
    staffId: n.staffId,
    type: n.type,
    title: n.title,
    content: n.content,
    refType: n.refType,
    refId: n.refId,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

/**
 * resetUnifiedNotifications：清空通知仓。
 * 仅供单测隔离用；生产代码不应调用。
 */
export function resetUnifiedNotifications(): void {
  store.clear();
  seq = 0;
}

/* ------------------------------------------------------------------ */
/* 入参收敛（纯工具）                                                    */
/* ------------------------------------------------------------------ */

/** 合法大类全集 */
export const UNIFIED_NOTIFICATION_TYPES: readonly UnifiedNotificationType[] = [
  'todo',
  'alert',
  'recommend',
  'interact',
];

/** 大类中文标签（前端 tab / 文案对齐用） */
export const UNIFIED_NOTIFICATION_TYPE_LABEL: Record<UnifiedNotificationType, string> = {
  todo: '待办',
  alert: '告警',
  recommend: '推荐',
  interact: '互动',
};

/** 任意值收敛为合法大类，越界回退 todo（安全默认：可见、可处理、不静默丢） */
function asType(v: unknown): UnifiedNotificationType {
  return UNIFIED_NOTIFICATION_TYPES.includes(v as UnifiedNotificationType)
    ? (v as UnifiedNotificationType)
    : 'todo';
}

/** 任意值 trim 为字符串，null/undefined 回退空串 */
function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 任意值收敛为可空字符串：空串 / 空白归一为 null */
function asNullableStr(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

/** 是否已读：readAt 非空即已读 */
function isUnread(n: Pick<UnifiedNotification, 'readAt'>): boolean {
  return n.readAt == null;
}

/* ------------------------------------------------------------------ */
/* 纯函数：推送 / 查询分页 / 已读                                          */
/* ------------------------------------------------------------------ */

/**
 * pushNotification：向某位医护「推送」一条统一通知（写入进程内通知仓）。
 *
 * 业务侧（医嘱审核、病历签收、审批、危急值、院感、药库低库存、AI 推荐、同事 @ …）
 * 产生消息时统一调用本函数收口，不再各自维护推送通道。
 *
 * 规则：
 *  - staffId / title 去空白后必填，缺失直接抛错（调用方编程错误，不应静默）；
 *  - type 越界回退 todo；content 缺省空串；refType / refId 空串归一为 null；
 *  - id 由 crypto.randomUUID() 生成；readAt 恒为 null（新通知必未读）；
 *  - createdAt 取当前时间 ISO 串；写入仓后返回构造好的通知（不返回入参引用）。
 *
 * @throws {Error} staffId 或 title 为空时抛出
 */
export function pushNotification(
  staffId: string,
  type: string,
  title: string,
  content?: string,
  refType?: string,
  refId?: string,
): UnifiedNotification {
  const sid = asStr(staffId);
  const ttl = asStr(title);
  if (!sid) throw new Error('pushNotification: staffId 不能为空');
  if (!ttl) throw new Error('pushNotification: title 不能为空');

  const n: StoredNotification = {
    id: crypto.randomUUID(),
    staffId: sid,
    type: asType(type),
    title: ttl,
    content: asStr(content),
    refType: asNullableStr(refType),
    refId: asNullableStr(refId),
    readAt: null,
    createdAt: new Date().toISOString(),
    _seq: ++seq,
  };

  const list = store.get(sid) ?? [];
  list.push(n);
  store.set(sid, list);
  return toPublic(n);
}

/**
 * getUnifiedNotifications：拉取某位医护的统一通知（按 createdAt 倒序）。
 *
 * - type 缺省 = 全部；type 非法时等同于「不按类型过滤」；
 * - page 从 1 起，pageSize 默认 20、上限 100，非法页码 / 条数收敛为安全默认；
 * - total 受 type 筛选影响（供分页器）；unread 为该接收人未读总数（不受 type
 *   筛选影响，供铃铛角标）；
 * - staffId 为空 / 无通知时返回空 Page，不抛错。
 */
export function getUnifiedNotifications(
  staffId: string,
  type?: UnifiedNotificationType,
  page?: number,
  pageSize?: number,
): Page<UnifiedNotification> {
  const sid = asStr(staffId);
  const size =
    typeof pageSize === 'number' && Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 100)
      : 20;
  const p =
    typeof page === 'number' && Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1;

  if (!sid) {
    return { items: [], total: 0, unread: 0, page: p, pageSize: size };
  }

  const all = store.get(sid) ?? [];

  // 未读总数（跨全部大类，供铃铛角标）
  const unread = all.filter(isUnread).length;

  // 按大类筛选后倒序（新建数组，不修改仓内顺序）：
  //   先按 createdAt 倒序；同毫秒推送再按 _seq 倒序，保证「最新在前」稳定可测
  const wantType = type && UNIFIED_NOTIFICATION_TYPES.includes(type) ? type : undefined;
  const filtered = all
    .filter((n) => (wantType ? n.type === wantType : true))
    .slice()
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b._seq - a._seq,
    );

  const start = (p - 1) * size;
  return {
    items: filtered.slice(start, start + size).map(toPublic),
    total: filtered.length,
    unread,
    page: p,
    pageSize: size,
  };
}

/**
 * markNotificationRead：把某位医护的某条通知置为已读。
 *
 * 同时限定通知属于该 staffId（越权改他人通知 → 抛错，由路由层转 404）；
 * 已读不回退：readAt 仅在仍为 null 时写入。返回更新后的通知副本。
 *
 * @throws {Error} 通知不存在 / 不属于本人时抛出
 */
export function markNotificationRead(
  notificationId: string,
  staffId: string,
): UnifiedNotification {
  const sid = asStr(staffId);
  const nid = asStr(notificationId);
  const list = store.get(sid) ?? [];
  const found = list.find((n) => n.id === nid);
  if (!found) {
    throw new Error('通知不存在或不属于本人');
  }
  if (found.readAt == null) {
    found.readAt = new Date().toISOString();
  }
  return toPublic(found);
}
