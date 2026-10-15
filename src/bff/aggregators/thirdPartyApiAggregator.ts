/**
 * 健澜科技 jlmedaios - M129-B 第三方对接开放接口聚合器（系统集成）
 *
 * 【系统集成】本模块为第三方对接（区域卫生平台 / 医联体协同 / 合作机构）的
 * 凭证与数据出口纯函数层：
 *  - buildThirdPartyApiKey()：生成一把新 API Key（明文仅返回一次），
 *    同时给出落库所需的 SHA-256 哈希、展示前缀与默认 90 天过期时刻；
 *  - hashApiKey()：Key 明文 -> SHA-256 hex，库内只存哈希，不存明文；
 *  - normalizePermissions()：把调用方传入的权限码收敛到白名单子集；
 *  - hasPermission()：按「最小授权」判定一把 Key 能否访问某数据面；
 *  - isApiKeyExpired()：过期判定（默认 90 天，可单测注入 now）；
 *  - maskPatientForOpenApi()：开放接口出口字段级脱敏，
 *    绝不向第三方泄露手机号/身份证/费用明细等敏感数据。
 *
 * 设计约束（生产安全）：
 *  - 纯函数：除 crypto 熵源（与 auth.ts 同风格，零新增依赖）外不碰 I/O，
 *    便于单测与复用；时间与随机源均可注入，保证断言确定性；
 *  - 凭证只存哈希：即使库表泄漏，也无法反推可用 Key；
 *  - 默认 90 天过期：过期 Key 与吊销 Key 同路径拒绝访问；
 *  - 不碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomBytes } from 'node:crypto';

/* ----------------------------------------------------------------------------
 * 常量
 * -------------------------------------------------------------------------- */

/** Key 固定前缀：jlsk_live_ 一眼可识别为健澜生产凭证（演示态为 jlsk_test_，本层不做环境分流） */
export const API_KEY_PREFIX = 'jlsk_live_';

/** API Key 默认有效期：90 天（安全要求：默认 90 天过期） */
export const API_KEY_DEFAULT_TTL_DAYS = 90;

/** 随机熵字节数：24 字节 -> base64url 后 32 字符，暴力枚举空间足够 */
const API_KEY_RANDOM_BYTES = 24;

/** Key 展示前缀长度（含固定前缀）：后台列表只看前 16 位即可区分对接方 */
const KEY_PREFIX_VISIBLE_LEN = 16;

/** 开放接口权限码白名单：新增数据面必须先在此登记，路由层才能授权 */
export const OPEN_API_PERMISSIONS = [
  'patient:read',
  'patient:visits:read',
  'patient:prescriptions:read',
] as const;

export type OpenApiPermission = (typeof OPEN_API_PERMISSIONS)[number];

/** buildThirdPartyApiKey 返回结构（明文 key 仅创建时出现一次） */
export interface ThirdPartyApiKey {
  /** 完整明文 Key：jlsk_live_ + 32 位 base64url 随机串；仅创建响应返回一次，库内不存 */
  key: string;
  /** 对接方名称 */
  name: string;
  /** 已收敛到白名单的权限码子集 */
  permissions: OpenApiPermission[];
  /** 过期时刻 ISO 字符串（默认 now + 90 天） */
  expires_at: string;
  /** 展示前缀（前 KEY_PREFIX_VISIBLE_LEN 位 + …），后台列表用，非凭证 */
  keyPrefix: string;
  /** Key 明文的 SHA-256 hex，落 medmuse.api_keys.key_hash */
  keyHash: string;
}

/** buildThirdPartyApiKey 入参（全部可选；时间与随机源可注入以便单测） */
export interface BuildApiKeyOptions {
  /** 对接方名称；空串兜底为「未命名对接方」 */
  name?: string;
  /** 请求授权的权限码；自动收敛到白名单，非法码静默剔除 */
  permissions?: readonly string[];
  /** 有效期天数；缺省 90 天；上限 365 天防超长凭证 */
  ttlDays?: number;
  /** 注入当前时间（单测用）；缺省取系统时钟 */
  now?: Date;
  /** 注入熵源（单测用）；缺省 node:crypto randomBytes */
  rng?: (size: number) => Buffer;
}

/* ----------------------------------------------------------------------------
 * 凭证哈希与格式
 * -------------------------------------------------------------------------- */

/** 对一段 UTF-8 文本做 SHA-256，返回 64 位小写 hex。 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** hashApiKey：Key 明文 -> 库内哈希。任何入参归一为 trim 后再哈希，杜绝空格绕撞。 */
export function hashApiKey(key: string): string {
  return sha256Hex((key ?? '').trim());
}

/** base64url 编码（去填充、+->-、/->_），零依赖 */
function base64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/* ----------------------------------------------------------------------------
 * 权限收敛与判定
 * -------------------------------------------------------------------------- */

/**
 * normalizePermissions：把任意输入权限码收敛为白名单子集（去重、去非法项）。
 * 空输入 -> 空集（最小授权原则：绝不默认放行任何数据面）。
 */
export function normalizePermissions(input: readonly unknown[] | undefined | null): OpenApiPermission[] {
  if (!Array.isArray(input)) return [];
  const whitelist = new Set<string>(OPEN_API_PERMISSIONS);
  const seen = new Set<OpenApiPermission>();
  for (const item of input) {
    if (typeof item === 'string' && whitelist.has(item)) {
      seen.add(item as OpenApiPermission);
    }
  }
  return Array.from(seen);
}

/**
 * hasPermission：判定一把 Key 是否已授予某数据面。
 *  - '*' 视为全量授权（仅限系统级兜底，正常对接方不发此码）；
 *  - 否则精确匹配权限码。
 */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (!Array.isArray(granted) || granted.length === 0) return false;
  if (granted.includes('*')) return true;
  return granted.includes(required);
}

/* ----------------------------------------------------------------------------
 * 过期判定
 * -------------------------------------------------------------------------- */

/** isApiKeyExpired：expires_at 已过 -> true；时间非法 -> 保守视为过期（拒绝访问）。 */
export function isApiKeyExpired(expiresAtIso: string | Date, now?: Date): boolean {
  const exp = expiresAtIso instanceof Date ? expiresAtIso : new Date(expiresAtIso);
  if (Number.isNaN(exp.getTime())) return true;
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return ref.getTime() >= exp.getTime();
}

/* ----------------------------------------------------------------------------
 * 开放接口出口脱敏
 * -------------------------------------------------------------------------- */

/** 开放接口允许下发给第三方的患者字段白名单：其余字段（费用明细、身份证、电话、
 *  床号、护理等级等）一律不出院，从出口层杜绝敏感数据泄露。 */
export const OPEN_API_PATIENT_FIELDS = [
  'id',
  'patientNo',
  'name',
  'gender',
  'age',
  'deptName',
  'diagnosis',
] as const;

/**
 * maskPatientForOpenApi：按字段白名单裁剪患者对象。
 * 非对象入参 -> 空对象；未知字段一律丢弃（白名单优于黑名单，新增字段默认不出院）。
 */
export function maskPatientForOpenApi(
  patient: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!patient || typeof patient !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const field of OPEN_API_PATIENT_FIELDS) {
    const value = patient[field];
    if (value !== undefined && value !== null) out[field] = value;
  }
  return out;
}

/* ----------------------------------------------------------------------------
 * 凭证生成（纯函数；熵源与时钟可注入）
 * -------------------------------------------------------------------------- */

/**
 * buildThirdPartyApiKey：为一个对接方生成一把新 API Key。
 *
 * @param options.name        对接方名称；缺省「未命名对接方」
 * @param options.permissions 请求授权的权限码；自动收敛到白名单
 * @param options.ttlDays     有效期天数；缺省 90 天，夹在 [1, 365] 天
 * @param options.now         注入当前时间（单测）
 * @param options.rng         注入熵源（单测）
 * @returns                   { key, name, permissions, expires_at, keyPrefix, keyHash }
 *
 * 安全要点：
 *  - 明文 key 只在本返回值中出现一次；路由层落库后即向调用方返回，随后丢弃；
 *  - 落库列只有 key_hash / key_prefix / name / permissions / expires_at；
 *  - 默认 90 天过期，过期后开放接口与吊销 Key 同路径 401 拒绝。
 */
export function buildThirdPartyApiKey(
  options: BuildApiKeyOptions = {},
): ThirdPartyApiKey {
  const name = (options.name ?? '').trim() || '未命名对接方';
  const permissions = normalizePermissions(options.permissions);

  // 有效期：缺省 90 天；非法值回退默认；硬上限 365 天防超长凭证
  let ttlDays = Number(options.ttlDays);
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) ttlDays = API_KEY_DEFAULT_TTL_DAYS;
  ttlDays = Math.min(Math.floor(ttlDays), 365);

  const now =
    options.now instanceof Date && !Number.isNaN(options.now.getTime())
      ? options.now
      : new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  // 熵源：默认 crypto.randomBytes；单测可注入确定性序列
  const entropy = options.rng ? options.rng(API_KEY_RANDOM_BYTES) : randomBytes(API_KEY_RANDOM_BYTES);
  const secret = base64Url(Buffer.isBuffer(entropy) ? entropy : Buffer.from(entropy));
  const key = `${API_KEY_PREFIX}${secret}`;

  return {
    key,
    name,
    permissions,
    expires_at: expiresAt.toISOString(),
    keyPrefix: `${key.slice(0, KEY_PREFIX_VISIBLE_LEN)}…`,
    keyHash: hashApiKey(key),
  };
}
