/**
 * 健澜科技 jlmedaios - 系统设置与个人偏好聚合器（M148-A · 产品化收尾）
 *
 * 为每位登录员工（staffId）提供一份即时生效的个人偏好，覆盖：
 *   - notification  通知偏好：短信 / 微信 / 站内信
 *   - appearance    界面偏好：主题色 / 字号 / 密度
 *   - assistant     助手偏好：AI 总开关 / 建议展示
 *   - workspace     工作台偏好：默认首页 / 常用功能置顶
 *
 * 设计要点（与全仓聚合器约定一致）：
 *  - getUserSettings / updateUserSetting 为纯函数：
 *    不打库、不修改入参、不抛错；读取恒返回全新深拷贝，更新写入运行时内存偏好库，
 *    因此「即时生效，不需要刷新」，也便于 bun:test 无依赖单测；
 *  - 持久化落表（iam.user_settings，见 deploy/postgres/init/300-user-settings.sql）
 *    由服务启动时从库表水合、变更后写回，不进入本纯函数路径；
 *  - 越权防护在路由层强制 staffId = 当前登录用户 c.user.id，本层不做鉴权。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 主题色（深海蓝 VI 体系内可选色板） */
export type ThemeColor = 'seaBlue' | 'teal' | 'violet' | 'slate';
/** 字号 */
export type FontSize = 'small' | 'medium' | 'large';
/** 界面密度 */
export type Density = 'compact' | 'normal' | 'spacious';
/** 默认首页 */
export type DefaultHome = 'workbench' | 'dashboard' | 'todos' | 'notifications';

/** 通知偏好（M148-A：短信 / 微信 / 站内信） */
export interface NotificationSettings {
  /** 短信通知 */
  sms: boolean;
  /** 微信通知 */
  wechat: boolean;
  /** 站内信通知 */
  inApp: boolean;
}

/** 界面偏好（M148-A：主题色 / 字号 / 密度） */
export interface AppearanceSettings {
  /** 主题色，默认深海蓝 seaBlue */
  themeColor: ThemeColor;
  /** 字号：小 / 中 / 大 */
  fontSize: FontSize;
  /** 界面密度：紧凑 / 标准 / 宽松 */
  density: Density;
}

/** 助手偏好（M148-A：AI 开关 / 建议展示） */
export interface AssistantSettings {
  /** AI 助手总开关 */
  aiEnabled: boolean;
  /** 是否在工作台展示 AI 建议 */
  suggestVisible: boolean;
}

/** 工作台偏好（M148-A：默认首页 / 常用功能置顶） */
export interface WorkspaceSettings {
  /** 登录后默认落地页 */
  defaultHome: DefaultHome;
  /** 常用功能置顶（功能编码列表，最多 12 个） */
  pinnedFavorites: string[];
}

/** 个人设置全集 */
export interface Settings {
  notification: NotificationSettings;
  appearance: AppearanceSettings;
  assistant: AssistantSettings;
  workspace: WorkspaceSettings;
}

/** 扁平偏好键（dotted path，路由层 PUT /:key 使用） */
export type SettingKey =
  | 'notification.sms'
  | 'notification.wechat'
  | 'notification.inApp'
  | 'appearance.themeColor'
  | 'appearance.fontSize'
  | 'appearance.density'
  | 'assistant.aiEnabled'
  | 'assistant.suggestVisible'
  | 'workspace.defaultHome'
  | 'workspace.pinnedFavorites';

/* ------------------------------------------------------------------ */
/* 纯函数：默认值 / 合法性收敛                                           */
/* ------------------------------------------------------------------ */

const ALL_THEME_COLORS: readonly ThemeColor[] = ['seaBlue', 'teal', 'violet', 'slate'];
const ALL_FONT_SIZES: readonly FontSize[] = ['small', 'medium', 'large'];
const ALL_DENSITIES: readonly Density[] = ['compact', 'normal', 'spacious'];
const ALL_DEFAULT_HOMES: readonly DefaultHome[] = ['workbench', 'dashboard', 'todos', 'notifications'];
/** 常用功能置顶上限（防恶意拖垮工作台渲染） */
const MAX_PINNED = 12;

/** 任意值收敛为布尔（仅 true 视为真，其余一律 false） */
function asBool(v: unknown): boolean {
  return v === true;
}

/** 任意值收敛为主题色，非法值回退深海蓝 seaBlue */
function asThemeColor(v: unknown): ThemeColor {
  return ALL_THEME_COLORS.includes(v as ThemeColor) ? (v as ThemeColor) : 'seaBlue';
}

/** 任意值收敛为字号，非法值回退 medium */
function asFontSize(v: unknown): FontSize {
  return ALL_FONT_SIZES.includes(v as FontSize) ? (v as FontSize) : 'medium';
}

/** 任意值收敛为密度，非法值回退 normal */
function asDensity(v: unknown): Density {
  return ALL_DENSITIES.includes(v as Density) ? (v as Density) : 'normal';
}

/** 任意值收敛为默认首页，非法值回退 workbench */
function asDefaultHome(v: unknown): DefaultHome {
  return ALL_DEFAULT_HOMES.includes(v as DefaultHome) ? (v as DefaultHome) : 'workbench';
}

/** 任意值收敛为去重后的功能编码列表（trim、去空、截断上限） */
function asPinnedFavorites(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const code = item.trim();
    if (!code || out.includes(code)) continue;
    out.push(code);
    if (out.length >= MAX_PINNED) break;
  }
  return out;
}

/**
 * defaultSettings：产出一份开箱即用的默认偏好。
 *
 * 安全默认值：站内信与 AI 助手开启（贴合临床工作站），短信 / 微信默认关，
 *   主题色深海蓝、中号字、标准密度，默认首页工作台、无置顶功能。
 *
 * 纯函数：每次返回结构一致的全新对象（含全新数组），不共享引用、不打库。
 */
export function defaultSettings(): Settings {
  return {
    notification: { sms: false, wechat: false, inApp: true },
    appearance: { themeColor: 'seaBlue', fontSize: 'medium', density: 'normal' },
    assistant: { aiEnabled: true, suggestVisible: true },
    workspace: { defaultHome: 'workbench', pinnedFavorites: [] },
  };
}

/**
 * isValidSettingKey：判断字符串是否为合法扁平偏好键（白名单）。
 * 路由层用它在 400 拦截未知 key；聚合器内部 switch 兜底再次收敛。
 */
export function isValidSettingKey(key: string): key is SettingKey {
  return (
    key === 'notification.sms' ||
    key === 'notification.wechat' ||
    key === 'notification.inApp' ||
    key === 'appearance.themeColor' ||
    key === 'appearance.fontSize' ||
    key === 'appearance.density' ||
    key === 'assistant.aiEnabled' ||
    key === 'assistant.suggestVisible' ||
    key === 'workspace.defaultHome' ||
    key === 'workspace.pinnedFavorites'
  );
}

/* ------------------------------------------------------------------ */
/* 运行时内存偏好库（纯函数读写 · 即时生效）                               */
/* ------------------------------------------------------------------ */

/**
 * 进程内偏好库：staffId -> 完整设置。
 * 设计意图：个人设置要求「即时生效，不需要刷新」，运行态以内存库为准；
 * 落库（iam.user_settings）为异步持久化，不阻塞、不污染纯函数语义。
 */
const runtimeStore = new Map<string, Settings>();

/** 深拷贝一份设置（读取/返回前调用，杜绝外部拿到内部引用后回写） */
function clone(s: Settings): Settings {
  return structuredClone(s);
}

/**
 * getUserSettings（纯函数）：读取某员工当前生效的偏好。
 *
 * 口径：
 *  - 从未设置过的员工返回 defaultSettings()，不写库、不留痕；
 *  - 已设置员工返回存储态的深拷贝；
 *  - 相同 staffId 多次调用返回全新对象，互不影响。
 */
export function getUserSettings(staffId: string): Settings {
  const id = String(staffId ?? '').trim();
  if (!id) return defaultSettings();
  const stored = runtimeStore.get(id);
  return stored ? clone(stored) : defaultSettings();
}

/**
 * updateUserSetting（纯函数）：按扁平键更新某员工的单条偏好，返回更新后的完整设置。
 *
 * 语义：
 *  - key 非法（不在白名单）时原样返回当前设置，不写库；
 *  - value 经按键收敛（布尔仅认 true / 枚举越界回退默认 / 列表去重截断）；
 *  - 其余偏好原样保留；返回值为新对象，不影响调用方持有的旧引用。
 *
 * @param staffId 员工 ID（路由层恒为 c.user.id）
 * @param key     扁平偏好键，如 notification.sms
 * @param value   新值（任意类型，按键收敛）
 */
export function updateUserSetting(staffId: string, key: string, value: unknown): Settings {
  const id = String(staffId ?? '').trim();
  if (!id || !isValidSettingKey(key)) return getUserSettings(id);

  // getUserSettings 已返回深拷贝，可安全就地改写字段而不污染库内对象
  const next = getUserSettings(id);
  switch (key) {
    case 'notification.sms':
      next.notification.sms = asBool(value);
      break;
    case 'notification.wechat':
      next.notification.wechat = asBool(value);
      break;
    case 'notification.inApp':
      next.notification.inApp = asBool(value);
      break;
    case 'appearance.themeColor':
      next.appearance.themeColor = asThemeColor(value);
      break;
    case 'appearance.fontSize':
      next.appearance.fontSize = asFontSize(value);
      break;
    case 'appearance.density':
      next.appearance.density = asDensity(value);
      break;
    case 'assistant.aiEnabled':
      next.assistant.aiEnabled = asBool(value);
      break;
    case 'assistant.suggestVisible':
      next.assistant.suggestVisible = asBool(value);
      break;
    case 'workspace.defaultHome':
      next.workspace.defaultHome = asDefaultHome(value);
      break;
    case 'workspace.pinnedFavorites':
      next.workspace.pinnedFavorites = asPinnedFavorites(value);
      break;
  }

  runtimeStore.set(id, clone(next));
  return clone(next);
}

/**
 * __resetUserSettingsStore：清空运行时偏好库。
 * 仅供单测 beforeEach 使用，生产代码不要调用。
 */
export function __resetUserSettingsStore(): void {
  runtimeStore.clear();
}
