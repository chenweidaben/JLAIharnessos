/**
 * 健澜科技 jlmedaios - 多语言支持框架 · 翻译聚合器（M151-C）
 *
 * 产品理念：i18n 不是写死在源码里的大对象，而是「可扩展的字典」。
 *   - translate(key, locale, params?)        纯函数：按命名空间 key 取文案，
 *                                             带 {{param}} 占位插值，locale 缺失时
 *                                             沿 目标语言 → 默认语言 → key 本身 回退；
 *   - getMissingTranslations(locale)          纯函数：对比默认语言，列出目标语言缺失的 key；
 *   - autoTranslate(key, sourceLocale, targetLocale)
 *                                             纯函数：基于可扩展的自动翻译规则做确定性
 *                                             短语替换，不触 LLM / 不触网络，结果可复现。
 *
 * 「可扩展、不写死」的实现口径：
 *   - 模块内维护进程内字典 registry：locale -> (key -> message)；
 *   - 新增语言 / 新增 key / 新增自动翻译规则，全部通过 register* 系列函数注入，
 *     不改既有逻辑；种子字典仅作内置兜底（后续可由 sys.i18n_translation 持久层
 *     启动加载，registry 作只读透传缓存）；
 *   - 全部取值为确定性纯函数，便于单测。
 *
 * 注释标注「质量补齐与新场景」。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 通用语言占位参数 */
export type I18nParams = Record<string, string | number>;

/** getMissingTranslations 返回的缺失项 */
export interface MissingKey {
  /** 命名空间 key，如 nav.dashboard */
  key: string;
  /** 基准（默认）语言 */
  sourceLocale: string;
  /** 被检查的目标语言 */
  targetLocale: string;
  /** 缺失原因说明 */
  reason: string;
}

/** 内置种子字典：单一来源，按语言分组（质量补齐与新场景） */
const BUILTIN_DICTIONARY: Record<string, Record<string, string>> = {
  'zh-CN': {
    'nav.dashboard': '工作台',
    'nav.patient': '患者管理',
    'nav.order': '医嘱',
    'nav.settings': '系统设置',
    'action.save': '保存',
    'action.cancel': '取消',
    'action.confirm': '确认',
    'action.submit': '提交',
    'error.network': '网络异常，请稍后重试',
    'error.not_found': '未找到请求的资源',
    'error.unauthorized': '登录已过期，请重新登录',
    'common.confirm': '确定',
    'common.loading': '加载中…',
    'common.welcome': '欢迎，{{name}}',
  },
  'en-US': {
    'nav.dashboard': 'Dashboard',
    'nav.patient': 'Patients',
    'nav.order': 'Orders',
    'nav.settings': 'Settings',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.submit': 'Submit',
    'error.network': 'Network error, please retry later',
    'error.not_found': 'Resource not found',
    'error.unauthorized': 'Session expired, please sign in again',
    'common.confirm': 'OK',
    'common.loading': 'Loading…',
    'common.welcome': 'Welcome, {{name}}',
  },
};

/** 内置自动翻译规则："源->目标" -> (短语 -> 译文)，可继续 registerAutoRule 扩充 */
const BUILTIN_AUTO_RULES: Record<string, Record<string, string>> = {
  'zh-CN->en-US': {
    保存: 'Save',
    取消: 'Cancel',
    确认: 'Confirm',
    提交: 'Submit',
    加载中: 'Loading',
    网络异常: 'Network error',
  },
  'en-US->zh-CN': {
    Save: '保存',
    Cancel: '取消',
    Confirm: '确认',
    Submit: '提交',
    Loading: '加载中',
    'Network error': '网络异常',
  },
};

/** 默认（回退）语言 */
export const DEFAULT_LOCALE = 'zh-CN';

/** 进程内字典：locale -> (key -> message) */
const registry = new Map<string, Map<string, string>>();
/** 自动翻译规则："源->目标" -> (短语 -> 译文) */
const autoRules = new Map<string, Map<string, string>>();
/** 种子是否已注入（幂等） */
let seeded = false;

/** 注入内置种子字典与规则（幂等；质量补齐与新场景） */
export function seedI18n(): void {
  if (seeded) return;
  for (const [locale, dict] of Object.entries(BUILTIN_DICTIONARY)) {
    registerTranslations(locale, dict);
  }
  for (const [key, rules] of Object.entries(BUILTIN_AUTO_RULES)) {
    const [src, tgt] = key.split('->');
    registerAutoRule(src, tgt, rules);
  }
  seeded = true;
}

/** 注册单条翻译（可扩展：新增 key 不影响既有逻辑） */
export function registerTranslation(locale: string, key: string, message: string): void {
  ensureLocale(locale).set(key, message);
}

/** 批量注册某语言下的翻译字典 */
export function registerTranslations(locale: string, dict: Record<string, string>): void {
  const map = ensureLocale(locale);
  for (const [key, message] of Object.entries(dict)) {
    map.set(key, message);
  }
}

/** 注册自动翻译规则（可扩展：新增短语对照不写死在函数体里） */
export function registerAutoRule(
  sourceLocale: string,
  targetLocale: string,
  rules: Record<string, string>,
): void {
  const key = `${sourceLocale}->${targetLocale}`;
  let map = autoRules.get(key);
  if (!map) {
    map = new Map<string, string>();
    autoRules.set(key, map);
  }
  for (const [phrase, translated] of Object.entries(rules)) {
    map.set(phrase, translated);
  }
}

/** 已登记的全部语言（可扩展） */
export function listLocales(): string[] {
  seedI18n();
  return Array.from(registry.keys()).sort();
}

/** 取某语言下的整包字典（供 BFF 一次性下发前端） */
export function getTranslationBundle(locale: string): Record<string, string> {
  seedI18n();
  const map = registry.get(normalize(locale));
  const out: Record<string, string> = {};
  if (!map) return out;
  for (const [k, v] of map.entries()) out[k] = v;
  return out;
}

function ensureLocale(locale: string): Map<string, string> {
  const normalized = normalize(locale);
  let map = registry.get(normalized);
  if (!map) {
    map = new Map<string, string>();
    registry.set(normalized, map);
  }
  return map;
}

function normalize(locale: string): string {
  // 'zh_CN' / 'zhcn' / 'zh-cn' 等写法统一为标准 locale
  return String(locale || '')
    .trim()
    .replace('_', '-')
    .toLowerCase()
    .replace(/^([a-z]{2})-([a-z]{2})$/i, (_m, a: string, b: string) => `${a}-${b.toUpperCase()}`);
}

/** 按回退链取原始文案（不插值）：目标语言 -> 默认语言 -> null */
function lookup(key: string, locale: string): string | null {
  seedI18n();
  const target = normalize(locale);
  const targetMap = registry.get(target);
  if (targetMap && targetMap.has(key)) return targetMap.get(key) as string;
  if (target !== DEFAULT_LOCALE) {
    const defMap = registry.get(DEFAULT_LOCALE);
    if (defMap && defMap.has(key)) return defMap.get(key) as string;
  }
  return null;
}

function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const v = params[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * 纯函数：翻译。
 * 命中即返回带参数插值后的文案；目标语言与默认语言均缺失时，返回 key 本身
 * （保证界面永远不会渲染 undefined，可扩展新 key 后由 getMissingTranslations 补齐）。
 */
export function translate(key: string, locale: string, params?: I18nParams): string {
  const raw = lookup(key, locale);
  if (raw === null) return key;
  return interpolate(raw, params);
}

/**
 * 纯函数：识别目标语言相对默认语言缺失的 key。
 * 以默认语言为基准（source），凡基准有、目标语言没有的 key 全部列出。
 */
export function getMissingTranslations(locale: string): MissingKey[] {
  seedI18n();
  const target = normalize(locale);
  const defMap = registry.get(DEFAULT_LOCALE) ?? new Map<string, string>();
  const targetMap = registry.get(target) ?? new Map<string, string>();
  const missing: MissingKey[] = [];
  for (const key of defMap.keys()) {
    if (!targetMap.has(key)) {
      missing.push({
        key,
        sourceLocale: DEFAULT_LOCALE,
        targetLocale: target,
        reason: `默认语言 ${DEFAULT_LOCALE} 已配置，但 ${target} 缺少该 key`,
      });
    }
  }
  return missing;
}

/**
 * 纯函数：确定性自动翻译（不触 LLM / 不触网络）。
 * 口径：
 *   1. 目标语言已有该 key -> 直接返回（幂等，不重复翻译）；
 *   2. 源语言没有该 key -> 返回 key 本身；
 *   3. 否则取源语言文案，套用可扩展的自动翻译规则做短语替换，未命中规则的
 *      片段原样保留——结果完全由 registry 决定，可复现、可单测。
 */
export function autoTranslate(key: string, sourceLocale: string, targetLocale: string): string {
  seedI18n();
  const tgt = normalize(targetLocale);
  // 已有译文则直接返回
  const existing = lookup(key, tgt);
  if (existing !== null && registry.get(tgt)?.has(key)) return existing;

  const src = normalize(sourceLocale);
  const srcMap = registry.get(src);
  const sourceText = srcMap?.get(key);
  if (!sourceText) return key;

  const rules = autoRules.get(`${src}->${tgt}`) ?? new Map<string, string>();
  let out = sourceText;
  // 长短语优先替换，避免子串抢先命中
  const phrases = Array.from(rules.keys()).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    out = out.split(phrase).join(rules.get(phrase) as string);
  }
  return out;
}
