/**
 * 健澜科技 jlmedaios - 多语言支持框架 · 聚合器单测（M151-C）
 *
 * 覆盖：
 *   1. translate 翻译查询：命中、参数插值、回退链、缺失 key 原样返回；
 *   2. getMissingTranslations 缺失识别：默认语言无缺失，目标语言缺 key 被列出；
 *   3. autoTranslate 自动翻译：已有译文幂等返回、规则确定性替换、源缺失返回 key；
 *   4. 语言切换：同一 key 切换 locale 返回不同文案；
 *   5. 可扩展性：register* 注入新 key / 新语言后即刻生效（不写死）。
 * 纯内存、不触 DB（bun:test）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  autoTranslate,
  DEFAULT_LOCALE,
  getMissingTranslations,
  listLocales,
  registerAutoRule,
  registerTranslation,
  registerTranslations,
  seedI18n,
  translate,
} from '../../src/bff/aggregators/i18nAggregator';

// 每个用例使用独立的命名空间 key，避免与内置字典互相污染
describe('translate（翻译查询）', () => {
  it('命中目标语言文案', () => {
    expect(translate('nav.dashboard', 'zh-CN')).toBe('工作台');
    expect(translate('nav.dashboard', 'en-US')).toBe('Dashboard');
  });

  it('支持 {{param}} 参数插值', () => {
    expect(translate('common.welcome', 'zh-CN', { name: '陈医生' })).toBe('欢迎，陈医生');
    expect(translate('common.welcome', 'en-US', { name: 'Dr. Chen' })).toBe('Welcome, Dr. Chen');
  });

  it('目标语言缺失时回退到默认语言', () => {
    // 注册一个仅默认语言有的 key
    registerTranslation('zh-CN', 'ut.only_default', '仅默认语言');
    // en-US 未注册该 key -> 回退 zh-CN
    expect(translate('ut.only_default', 'en-US')).toBe('仅默认语言');
  });

  it('两种语言都缺失时原样返回 key（界面不渲染 undefined）', () => {
    expect(translate('ut.not.exist', 'zh-CN')).toBe('ut.not.exist');
    expect(translate('ut.not.exist', 'en-US')).toBe('ut.not.exist');
  });
});

describe('getMissingTranslations（缺失识别）', () => {
  it('默认语言自身无缺失', () => {
    expect(getMissingTranslations(DEFAULT_LOCALE).length).toBe(0);
  });

  it('目标语言缺少的默认语言 key 被列出', () => {
    // 给默认语言新增一个 en-US 没有的 key
    registerTranslation('zh-CN', 'ut.missing_in_en', '待翻译');
    const missing = getMissingTranslations('en-US');
    const hit = missing.find((m) => m.key === 'ut.missing_in_en');
    expect(hit).toBeDefined();
    expect(hit?.sourceLocale).toBe(DEFAULT_LOCALE);
    expect(hit?.targetLocale).toBe('en-US');
  });

  it('补齐后不再缺失（质量补齐与新场景）', () => {
    registerTranslation('en-US', 'ut.missing_in_en', 'To be translated');
    const missing = getMissingTranslations('en-US');
    expect(missing.find((m) => m.key === 'ut.missing_in_en')).toBeUndefined();
  });
});

describe('autoTranslate（确定性自动翻译）', () => {
  it('目标语言已有译文时幂等返回，不重复翻译', () => {
    expect(autoTranslate('nav.dashboard', 'zh-CN', 'en-US')).toBe('Dashboard');
  });

  it('按可扩展规则做确定性短语替换', () => {
    registerTranslation('zh-CN', 'ut.auto_demo', '保存并提交');
    // 内置规则：保存->Save、提交->Submit
    const out = autoTranslate('ut.auto_demo', 'zh-CN', 'en-US');
    expect(out).toBe('Save并Submit');
  });

  it('注册新规则后即刻生效（可扩展，不写死）', () => {
    registerAutoRule('zh-CN', 'en-US', { 并: 'and' });
    registerTranslation('zh-CN', 'ut.auto_newrule', '保存并取消');
    const out = autoTranslate('ut.auto_newrule', 'zh-CN', 'en-US');
    expect(out).toBe('SaveandCancel');
  });

  it('源语言没有该 key 时返回 key 本身', () => {
    expect(autoTranslate('ut.no_source_key', 'zh-CN', 'en-US')).toBe('ut.no_source_key');
  });
});

describe('语言切换', () => {
  it('同一 key 切换 locale 返回不同文案', () => {
    const zh = translate('action.save', 'zh-CN');
    const en = translate('action.save', 'en-US');
    expect(zh).not.toBe(en);
    expect(zh).toBe('保存');
    expect(en).toBe('Save');
  });

  it('批量注册新语言后 listLocales 可扩展发现', () => {
    registerTranslations('ja-JP', { 'ut.hello': 'こんにちは' });
    seedI18n();
    expect(listLocales()).toContain('ja-JP');
    expect(translate('ut.hello', 'ja-JP')).toBe('こんにちは');
  });
});
