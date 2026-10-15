/**
 * 健澜科技 jlmedaios - M124-A 系统配置中心聚合器（运维工具）
 *
 * 本模块为纯函数层，不依赖数据库与网络，便于单测与复用：
 *  - SystemConfigEntry：与 medmuse.system_config 行对齐；
 *  - getConfig(key, defaultValue, configs)：按键读取，缺失/非法入参回退默认值；
 *  - setConfig(key, value, updatedBy, configs)：按键 upsert，返回新数组（不可变）；
 *  - filterByCategory(category, configs)：按分类收敛看板视图。
 *
 * 生产安全加固：
 *  - value 统一为字符串；布尔/数值由调用方显式解析，避免隐式类型转换漏洞；
 *  - setConfig 不 mutate 入参，始终返回新数组，便于前端不可变更新；
 *  - updatedBy 由路由层从登录态注入，前端不可伪造。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条系统配置（与 medmuse.system_config 行对齐） */
export interface SystemConfigEntry {
  /** 配置键（dot.case 命名空间，主键） */
  key: string;
  /** 配置值（统一字符串落库） */
  value: string;
  /** 配置说明（运维可读的用途与取值范围） */
  description: string;
  /** 分类：auth / notify / feature / maintenance / general */
  category: string;
  /** 最近更新时间 ISO 字符串 */
  updatedAt: string;
  /** 最近更新人工号 */
  updatedBy: string;
}

/** 入参归一：去空白；null/undefined 兜底为空串 */
function normalize(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

/**
 * 按键读取配置值（纯函数）。
 *  - key 未命中、configs 非数组、key 为空：返回 defaultValue；
 *  - 命中即返回字符串 value（调用方按需解析类型）。
 */
export function getConfig(
  key: string,
  defaultValue: string,
  configs: SystemConfigEntry[],
): string {
  const k = normalize(key);
  if (!k || !Array.isArray(configs)) return defaultValue;
  const hit = configs.find((c) => normalize(c.key) === k);
  return hit ? hit.value : defaultValue;
}

/**
 * 按键 upsert 配置（纯函数，不可变）。
 *  - 已存在：更新 value / updatedAt / updatedBy；description / category 保留原值；
 *  - 不存在：追加新条目，category 缺省为 'general'，description 缺省为空串；
 *  - 返回新数组，不 mutate 入参；updatedAt 取当前时刻 ISO。
 */
export function setConfig(
  key: string,
  value: string,
  updatedBy: string,
  configs: SystemConfigEntry[],
): SystemConfigEntry[] {
  const k = normalize(key);
  if (!k) return Array.isArray(configs) ? [...configs] : [];
  const list = Array.isArray(configs) ? configs : [];
  const v = typeof value === 'string' ? value : String(value ?? '');
  const stamp = new Date().toISOString();
  const idx = list.findIndex((c) => normalize(c.key) === k);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = {
      ...next[idx],
      value: v,
      updatedAt: stamp,
      updatedBy: normalize(updatedBy),
    };
    return next;
  }
  return [
    ...list,
    {
      key: k,
      value: v,
      description: '',
      category: 'general',
      updatedAt: stamp,
      updatedBy: normalize(updatedBy),
    },
  ];
}

/**
 * 按分类筛选配置（纯函数）。
 *  - category 为空：返回全量（按 key 字典序稳定排序，便于看板渲染）；
 *  - 大小写不敏感精确匹配；configs 非数组安全返回空数组。
 */
export function filterByCategory(
  category: string,
  configs: SystemConfigEntry[],
): SystemConfigEntry[] {
  if (!Array.isArray(configs)) return [];
  const cat = normalize(category).toLowerCase();
  const list = cat
    ? configs.filter((c) => normalize(c.category).toLowerCase() === cat)
    : [...configs];
  return list.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
