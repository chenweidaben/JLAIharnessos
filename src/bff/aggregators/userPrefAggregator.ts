/**
 * 健澜科技 jlmedaios - 个性化偏好与统一通知聚合器（M158-D · 用户体验深化）
 *
 * v4.x近期：为每位登录员工提供「开箱即用、即时生效、随账号漫游」的个性化偏好，
 *   并把分散在各业务域（危急值 / 待办 / 会诊 / 系统公告）的通知收敛成一份统一收件箱。
 *
 * 覆盖偏好项（与本切片需求逐项对齐）：
 *   - theme           外观主题：深海蓝 seaBlue / 浅色 light / 高对比 highContrast
 *   - notifyChannels   通知方式（多选）：站内 inApp / 邮件 email / 短信 sms
 *   - defaultHome      默认首页：工作台 workbench / 患者列表 patientList / 驾驶舱 cockpit
 *   - pageSize         列表每页条数：10 / 20 / 50
 *   - assistant        助手开关：AI 辅助 aiAssist / 语音录入 voiceInput / 智能提示 smartTips
 *
 * 设计要点（与全仓聚合器约定一致，纯函数路径）：
 *  - buildUserPreferences / getNotificationSettings / unifyNotifications 均为纯函数：
 *    不打库、不修改入参、不抛错；读取恒返回全新深拷贝，便于 bun:test 无依赖单测；
 *  - 持久化落表由服务启动时水合、变更后异步写回，不进入本纯函数路径（本切片不写 SQL、无新表）；
 *  - 越权防护在路由层强制 userId = 当前登录用户 c.user.id，本层不做鉴权；
 *  - 不触碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 外观主题：深海蓝 VI / 浅色 / 高对比（无障碍） */
export type ThemeMode = 'seaBlue' | 'light' | 'highContrast';
/** 通知方式：站内 / 邮件 / 短信 */
export type NotifyChannel = 'inApp' | 'email' | 'sms';
/** 默认首页：工作台 / 患者列表 / 驾驶舱 */
export type DefaultHome = 'workbench' | 'patientList' | 'cockpit';
/** 每页条数（仅允许这三档，越界收敛回 20） */
export type PageSize = 10 | 20 | 50;

/** 助手开关组 */
export interface AssistantToggles {
  /** AI 辅助（病历生成 / 诊断建议等总开关之一） */
  aiAssist: boolean;
  /** 语音录入 */
  voiceInput: boolean;
  /** 智能提示（智能纠错 / 用药提醒等被动提示） */
  smartTips: boolean;
}

/** 用户个性化偏好全集 */
export interface Preferences {
  /** 外观主题，默认深海蓝 seaBlue */
  theme: ThemeMode;
  /** 通知方式（多选，默认仅站内） */
  notifyChannels: NotifyChannel[];
  /** 默认首页，默认工作台 workbench */
  defaultHome: DefaultHome;
  /** 列表每页条数，默认 20 */
  pageSize: PageSize;
  /** 助手开关组 */
  assistant: AssistantToggles;
}

/** 偏好更新片段（PUT body）：所有字段可选，assistant 也支持单键部分提交 */
export interface PreferencesPatch {
  theme?: ThemeMode;
  notifyChannels?: NotifyChannel[];
  defaultHome?: DefaultHome;
  pageSize?: PageSize;
  assistant?: Partial<AssistantToggles>;
}

/** 通知通道开关（由 notifyChannels 派生，便于前端直接消费） */
export interface NotificationSettings {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

/** 统一通知级别 */
export type NotifyLevel = 'info' | 'warning' | 'critical';

/** 统一通知条目（跨业务域收敛后的收件箱模型） */
export interface UnifiedNotification {
  /** 全局唯一通知 ID */
  id: string;
  /** 业务类型：criticalValue 危急值 / todo 待办 / consult 会诊 / system 系统 */
  type: string;
  title: string;
  summary: string;
  level: NotifyLevel;
  /** 是否已读 */
  read: boolean;
  /** 实际送达通道（按用户已开启通道择优路由） */
  channel: NotifyChannel;
  /** 发生时间（ISO8601，固定样本时间，保证纯函数可重复） */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* 纯函数：默认值 / 合法性收敛                                           */
/* ------------------------------------------------------------------ */

const ALL_THEMES: readonly ThemeMode[] = ['seaBlue', 'light', 'highContrast'];
const ALL_CHANNELS: readonly NotifyChannel[] = ['inApp', 'email', 'sms'];
const ALL_HOMES: readonly DefaultHome[] = ['workbench', 'patientList', 'cockpit'];
const ALL_PAGE_SIZES: readonly PageSize[] = [10, 20, 50];
/** 通道送达优先级：站内 > 邮件 > 短信（成本与及时性折中） */
const CHANNEL_PRIORITY: readonly NotifyChannel[] = ['inApp', 'email', 'sms'];

/** 任意值收敛为布尔（仅 true 视为真，其余一律 false） */
function asBool(v: unknown): boolean {
  return v === true;
}

/** 任意值收敛为主题，非法回退深海蓝 seaBlue */
function asTheme(v: unknown): ThemeMode {
  return ALL_THEMES.includes(v as ThemeMode) ? (v as ThemeMode) : 'seaBlue';
}

/** 任意值收敛为合法通知通道数组（trim、去空、去重；允许全关空数组） */
function asChannels(v: unknown): NotifyChannel[] {
  if (!Array.isArray(v)) return [];
  const out: NotifyChannel[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const ch = item.trim() as NotifyChannel;
    if (!ALL_CHANNELS.includes(ch) || out.includes(ch)) continue;
    out.push(ch);
  }
  return out;
}

/** 任意值收敛为默认首页，非法回退工作台 workbench */
function asHome(v: unknown): DefaultHome {
  return ALL_HOMES.includes(v as DefaultHome) ? (v as DefaultHome) : 'workbench';
}

/** 任意值收敛为每页条数，仅认 10/20/50，否则回退 20 */
function asPageSize(v: unknown): PageSize {
  const n = typeof v === 'number' ? v : Number(v);
  return ALL_PAGE_SIZES.includes(n as PageSize) ? (n as PageSize) : 20;
}

/**
 * defaultPreferences：开箱即用的默认偏好。
 *
 * 安全默认值：主题深海蓝 VI、仅站内信（邮件/短信默认关，避免临床骚扰）、
 *   默认工作台、每页 20 条、三项助手能力默认开启。
 *
 * 纯函数：每次返回结构一致的全新对象（含全新数组），不共享引用、不打库。
 */
export function defaultPreferences(): Preferences {
  return {
    theme: 'seaBlue',
    notifyChannels: ['inApp'],
    defaultHome: 'workbench',
    pageSize: 20,
    assistant: { aiAssist: true, voiceInput: true, smartTips: true },
  };
}

/* ------------------------------------------------------------------ */
/* 运行时内存偏好库（纯函数读写 · 即时生效）                               */
/* ------------------------------------------------------------------ */

/**
 * 进程内偏好库：userId -> Preferences。
 * 个人偏好要求「即时生效，不需要刷新」，运行态以内存库为准；
 * 落库为异步持久化，不阻塞、不污染纯函数语义。
 */
const runtimeStore = new Map<string, Preferences>();

/** 深拷贝（读取/返回前调用，杜绝外部拿到内部引用后回写） */
function clone<T>(v: T): T {
  return structuredClone(v);
}

/**
 * buildUserPreferences（纯函数）：读取某用户当前生效的个性化偏好。
 *
 * 口径：
 *  - 从未设置过的用户返回 defaultPreferences()，不写库、不留痕；
 *  - 已设置用户返回存储态的深拷贝；
 *  - 相同 userId 多次调用返回全新对象，互不影响。
 */
export function buildUserPreferences(userId: string): Preferences {
  const id = String(userId ?? '').trim();
  if (!id) return defaultPreferences();
  const stored = runtimeStore.get(id);
  return stored ? clone(stored) : defaultPreferences();
}

/**
 * getNotificationSettings（纯函数）：由偏好派生三通道开关。
 * 前端可直接用 inApp/email/sms 布尔值渲染通知方式开关组，无需自行数组成员判断。
 */
export function getNotificationSettings(userId: string): NotificationSettings {
  const prefs = buildUserPreferences(userId);
  return {
    inApp: prefs.notifyChannels.includes('inApp'),
    email: prefs.notifyChannels.includes('email'),
    sms: prefs.notifyChannels.includes('sms'),
  };
}

/**
 * saveUserPreferences（纯函数）：部分更新某用户偏好，返回更新后的完整偏好。
 *
 * 语义：patch 中出现的字段才收敛并写回，未出现字段原样保留；
 *   非法值一律收敛回合法值（不抛错）；返回值为新对象，不影响调用方旧引用。
 *
 * @param userId 当前登录用户（路由层恒为 c.user.id）
 * @param patch  待更新的偏好片段
 */
export function saveUserPreferences(userId: string, patch: PreferencesPatch): Preferences {
  const id = String(userId ?? '').trim();
  if (!id || patch === null || typeof patch !== 'object') return buildUserPreferences(id);

  // buildUserPreferences 已返回深拷贝，可安全就地改写字段而不污染库内对象
  const next = buildUserPreferences(id);
  if (patch.theme !== undefined) next.theme = asTheme(patch.theme);
  if (patch.notifyChannels !== undefined) next.notifyChannels = asChannels(patch.notifyChannels);
  if (patch.defaultHome !== undefined) next.defaultHome = asHome(patch.defaultHome);
  if (patch.pageSize !== undefined) next.pageSize = asPageSize(patch.pageSize);
  if (patch.assistant !== null && typeof patch.assistant === 'object') {
    if (patch.assistant.aiAssist !== undefined) next.assistant.aiAssist = asBool(patch.assistant.aiAssist);
    if (patch.assistant.voiceInput !== undefined) next.assistant.voiceInput = asBool(patch.assistant.voiceInput);
    if (patch.assistant.smartTips !== undefined) next.assistant.smartTips = asBool(patch.assistant.smartTips);
  }

  runtimeStore.set(id, clone(next));
  return clone(next);
}

/* ------------------------------------------------------------------ */
/* 统一通知：跨业务域收件箱                                                */
/* ------------------------------------------------------------------ */

/** 原始通知样本（纯函数内置、固定时间戳，不打库、不依赖 Date.now） */
interface RawNotification {
  id: string;
  type: string;
  title: string;
  summary: string;
  level: NotifyLevel;
  read: boolean;
  createdAt: string;
  /** 该通知业务上支持的送达通道 */
  supported: NotifyChannel[];
}

const RAW_INBOX: readonly RawNotification[] = [
  {
    id: 'ntf-cv-1001',
    type: 'criticalValue',
    title: '危急值待处理：血钾 6.8 mmol/L',
    summary: '住院床旁患者血钾危急值，请立即复核并处置。',
    level: 'critical',
    read: false,
    createdAt: '2026-10-16T08:30:00+08:00',
    supported: ['inApp', 'sms', 'email'],
  },
  {
    id: 'ntf-todo-2001',
    type: 'todo',
    title: '今日待办 3 项',
    summary: '含 2 份出院记录待签、1 份用药审核待确认。',
    level: 'info',
    read: false,
    createdAt: '2026-10-16T07:50:00+08:00',
    supported: ['inApp'],
  },
  {
    id: 'ntf-consult-3001',
    type: 'consult',
    title: '会诊申请待回复：普外科 -> 内分泌科',
    summary: '会诊申请已等待 40 分钟，请尽快响应。',
    level: 'warning',
    read: true,
    createdAt: '2026-10-15T18:05:00+08:00',
    supported: ['inApp', 'email'],
  },
  {
    id: 'ntf-sys-4001',
    type: 'system',
    title: '系统夜间维护通知',
    summary: '本周六 23:00-23:30 进行例行升级，期间登录可能短暂中断。',
    level: 'info',
    read: true,
    createdAt: '2026-10-15T16:00:00+08:00',
    supported: ['inApp', 'email'],
  },
];

/**
 * unifyNotifications（纯函数）：把跨业务域通知收敛成一份统一收件箱。
 *
 * 口径：
 *  - types 为白名单过滤（如 ['criticalValue','todo']）；不传或空数组返回全部；
 *  - 通道路由：按用户已开启通道（getNotificationSettings）与该通知支持通道取交集，
 *    按「站内 > 邮件 > 短信」择优作为实际送达通道；交集为空则不送达（跳过）；
 *  - 按 createdAt 倒序、按 id 去重；返回全新深拷贝。
 *
 * @param userId 当前登录用户
 * @param types  可选的业务类型白名单
 */
export function unifyNotifications(userId: string, types?: readonly string[]): UnifiedNotification[] {
  const settings = getNotificationSettings(userId);
  const enabled: NotifyChannel[] = CHANNEL_PRIORITY.filter((ch) => settings[ch]);
  const wanted = Array.isArray(types) ? types.map((t) => String(t ?? '').trim()).filter(Boolean) : [];

  const out: UnifiedNotification[] = [];
  const seen = new Set<string>();
  for (const raw of RAW_INBOX) {
    if (wanted.length > 0 && !wanted.includes(raw.type)) continue;
    if (seen.has(raw.id)) continue;

    // 路由：在用户已开启通道里，挑优先级最高的、且该通知支持的通道
    const routed = enabled.find((ch) => raw.supported.includes(ch));
    if (!routed) continue; // 用户对这类通道全关，则不打扰

    seen.add(raw.id);
    out.push({
      id: raw.id,
      type: raw.type,
      title: raw.title,
      summary: raw.summary,
      level: raw.level,
      read: raw.read,
      channel: routed,
      createdAt: raw.createdAt,
    });
  }

  // 时间倒序（最新在前）
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return clone(out);
}

/**
 * __resetUserPrefStore：清空运行时偏好库。
 * 仅供单测 beforeEach 使用，生产代码不要调用。
 */
export function __resetUserPrefStore(): void {
  runtimeStore.clear();
}
