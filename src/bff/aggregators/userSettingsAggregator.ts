/**
 * 健澜科技 jlmedaios - 用户个人设置聚合器（M132-D · 产品化收尾）
 *
 * 为每位登录用户提供一份可持久化的个人偏好，覆盖：
 *   - notification  通知偏好（站内 / 邮件 / 短信 / 提示音）
 *   - appearance    界面偏好（主题 light|dark|auto / 字号 small|medium|large）
 *   - assistant     智能助手开关（总开关 / 自动诊疗建议）
 *   - workspace     默认科室 / 默认病房
 *
 * 设计要点（与全仓聚合器约定一致）：
 *  - getDefaultSettings / sanitizeSettings / mergeSettings 为纯函数，
 *    不修改入参、不打库，便于单测与前端本地复用；
 *  - getUserSettings / saveUserSettings 为薄持久化层，全部包 try/catch：
 *    断库 / 表未迁移时降级为「默认设置」，不抛 5xx；
 *  - 越权防护在路由层强制 user_id = 当前登录用户，本层不做鉴权。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 界面主题 */
export type ThemeMode = 'light' | 'dark' | 'auto';
/** 界面字号 */
export type FontSize = 'small' | 'medium' | 'large';

/** 通知偏好 */
export interface NotificationSettings {
  /** 站内消息通知 */
  inApp: boolean;
  /** 邮件通知 */
  email: boolean;
  /** 短信通知 */
  sms: boolean;
  /** 消息提示音 */
  sound: boolean;
}

/** 界面偏好 */
export interface AppearanceSettings {
  /** 主题：浅色 / 深色 / 跟随系统 */
  theme: ThemeMode;
  /** 字号：小 / 中 / 大 */
  fontSize: FontSize;
}

/** 智能助手偏好 */
export interface AssistantSettings {
  /** 智能助手总开关 */
  enabled: boolean;
  /** 开方 / 病历场景自动给出诊疗建议 */
  autoSuggest: boolean;
}

/** 工作台偏好（默认科室 / 病房） */
export interface WorkspaceSettings {
  /** 默认科室编码，空串表示未设置 */
  defaultDeptCode: string;
  /** 默认病房编码，空串表示未设置 */
  defaultWardCode: string;
}

/** 个人设置全集 */
export interface Settings {
  notification: NotificationSettings;
  appearance: AppearanceSettings;
  assistant: AssistantSettings;
  workspace: WorkspaceSettings;
}

/**
 * 设置补丁：分类级部分更新。
 *
 * 顶层四分类可选；每一类内部字段也全部可选——前端可只提交
 *   { notification: { sound: false } } 这样的局部增量，
 *   未提及的分类 / 字段由 mergeSettings 保留基线值。
 */
export type SettingsPatch = {
  notification?: Partial<NotificationSettings>;
  appearance?: Partial<AppearanceSettings>;
  assistant?: Partial<AssistantSettings>;
  workspace?: Partial<WorkspaceSettings>;
};

/** 持久化后的设置（含用户标识与元数据） */
export interface StoredSettings {
  userId: string;
  settings: Settings;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 纯函数：默认值 / 校验 / 分类合并                                      */
/* ------------------------------------------------------------------ */

const ALL_THEMES: readonly ThemeMode[] = ['light', 'dark', 'auto'];
const ALL_FONT_SIZES: readonly FontSize[] = ['small', 'medium', 'large'];

/** 任意值收敛为布尔（仅 true 视为真，其余一律 false） */
function asBool(v: unknown): boolean {
  return v === true;
}

/** 任意值收敛为主题，非法值回退 light */
function asTheme(v: unknown): ThemeMode {
  return ALL_THEMES.includes(v as ThemeMode) ? (v as ThemeMode) : 'light';
}

/** 任意值收敛为字号，非法值回退 medium */
function asFontSize(v: unknown): FontSize {
  return ALL_FONT_SIZES.includes(v as FontSize) ? (v as FontSize) : 'medium';
}

/** 任意值收敛为去除首尾空白的字符串（null/undefined 回退空串） */
function asTrimmedStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * getDefaultSettings：按角色产出一份开箱即用的默认设置。
 *
 * 角色差异（「产品化收尾」的角色化默认值）：
 *  - patient（患者）：只开站内 + 邮件通知；临床智能助手默认关闭，
 *    不暴露科室 / 病房这类医护专属工作台概念；
 *  - doctor / nurse / pharmacist / admin（医护与管理员）：
 *    站内 + 邮件 + 提示音开启，智能助手默认开启并自动给建议；
 *  - 未知角色：按医护安全默认值给出（浅色 / 中号 / 助手开），
 *    避免新角色首次进入时工作台功能被静默关闭。
 *
 * 纯函数：相同角色返回结构一致的全新对象，不共享引用、不打库。
 *
 * @param role 角色编码（取当前用户主角色；null/undefined 走安全默认）
 */
export function getDefaultSettings(role?: string | null): Settings {
  const r = (role ?? '').toLowerCase();

  // 患者侧：以沟通通知为主，临床助手不默认开启
  if (r === 'patient') {
    return {
      notification: { inApp: true, email: true, sms: false, sound: false },
      appearance: { theme: 'light', fontSize: 'medium' },
      assistant: { enabled: false, autoSuggest: false },
      workspace: { defaultDeptCode: '', defaultWardCode: '' },
    };
  }

  // 医护 / 管理员：通知与智能助手默认开启，贴合日常工作站
  return {
    notification: { inApp: true, email: true, sms: false, sound: true },
    appearance: { theme: 'light', fontSize: 'medium' },
    assistant: { enabled: true, autoSuggest: true },
    workspace: { defaultDeptCode: '', defaultWardCode: '' },
  };
}

/**
 * sanitizeSettings：把任意（来自 jsonb / 请求体的）原始值收敛为合法 Settings。
 *
 * 口径：以 base 默认值为骨架，逐字段做类型与枚举校验——
 *   布尔仅认 true；主题 / 字号越界回退默认；科室病房做 trim。
 * 这样即便历史脏数据或客户端乱传，落库前也一定是结构完整、取值合法的设置。
 *
 * 纯函数：不修改入参；raw 为 null/undefined 时直接返回 base 的拷贝。
 */
export function sanitizeSettings(raw: unknown, base: Settings): Settings {
  const o = (raw ?? {}) as Record<string, unknown>;
  const n = (o.notification ?? {}) as Record<string, unknown>;
  const a = (o.appearance ?? {}) as Record<string, unknown>;
  const asst = (o.assistant ?? {}) as Record<string, unknown>;
  const w = (o.workspace ?? {}) as Record<string, unknown>;

  return {
    notification: {
      inApp: asBool(n.inApp ?? base.notification.inApp),
      email: asBool(n.email ?? base.notification.email),
      sms: asBool(n.sms ?? base.notification.sms),
      sound: asBool(n.sound ?? base.notification.sound),
    },
    appearance: {
      theme: asTheme(a.theme ?? base.appearance.theme),
      fontSize: asFontSize(a.fontSize ?? base.appearance.fontSize),
    },
    assistant: {
      enabled: asBool(asst.enabled ?? base.assistant.enabled),
      autoSuggest: asBool(asst.autoSuggest ?? base.assistant.autoSuggest),
    },
    workspace: {
      defaultDeptCode: asTrimmedStr(w.defaultDeptCode ?? base.workspace.defaultDeptCode),
      defaultWardCode: asTrimmedStr(w.defaultWardCode ?? base.workspace.defaultWardCode),
    },
  };
}

/**
 * mergeSettings：分类级「部分更新」合并（分类管理）。
 *
 * 语义：patch 可只携带某几个分类（如只传 { notification: { sound: false } }），
 *   未携带的分类原样保留；同一分类内只覆盖出现的字段，其余沿用 current。
 * 合并结果再经 sanitizeSettings 收敛，保证输出永远合法。
 *
 * 纯函数：不修改 current / patch；patch 为 null/undefined 时返回 current 的合法拷贝。
 *
 * @param current 现有设置（完整、合法）
 * @param patch   前端提交的分类级增量
 */
export function mergeSettings(
  current: Settings,
  patch: SettingsPatch | null | undefined,
): Settings {
  const p = (patch ?? {}) as SettingsPatch;
  const merged: Settings = {
    notification: { ...current.notification, ...(p.notification ?? {}) },
    appearance: { ...current.appearance, ...(p.appearance ?? {}) },
    assistant: { ...current.assistant, ...(p.assistant ?? {}) },
    workspace: { ...current.workspace, ...(p.workspace ?? {}) },
  };
  // 以 current 为骨架做一次合法性收敛，防止 patch 里夹带非法枚举/类型
  return sanitizeSettings(merged, current);
}

/* ------------------------------------------------------------------ */
/* 薄持久化层（断库降级，不抛 5xx）                                       */
/* ------------------------------------------------------------------ */

/** iam.user_settings 行（postgres.js 返回形态） */
interface UserSettingsDbRow {
  user_id: string;
  settings: unknown;
  updated_at: string | Date;
}

function asDate(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * getUserSettings：读取某用户已保存的设置。
 *
 * 降级口径：表未迁移 / 断库 / 无记录时统一返回 null，
 *   由路由层兜底为 getDefaultSettings，不抛错。
 */
export async function getUserSettings(userId: string): Promise<StoredSettings | null> {
  try {
    const rows = await getDb()<UserSettingsDbRow[]>`
      SELECT user_id, settings, updated_at
      FROM iam.user_settings
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    // 落库数据再经一次收敛，兼容历史脏数据
    const safe = sanitizeSettings(row.settings, getDefaultSettings());
    return {
      userId: row.user_id,
      settings: safe,
      updatedAt: asDate(row.updated_at),
    };
  } catch (e) {
    console.warn('[user-settings] 读取失败，降级为默认设置:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * saveUserSettings：把设置 UPSERT 到 iam.user_settings，updated_at 刷新为 now()。
 * 调用方应先经 mergeSettings / sanitizeSettings 收敛，本层只负责落库。
 */
export async function saveUserSettings(
  userId: string,
  settings: Settings,
): Promise<void> {
  await getDb()`
    INSERT INTO iam.user_settings (user_id, settings, updated_at)
    VALUES (${userId}, ${settings}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET
      settings   = EXCLUDED.settings,
      updated_at = now()
  `;
}
