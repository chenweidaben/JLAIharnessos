/**
 * 健澜科技 jlmedaios - 用户个人设置（M132-D · 产品化收尾）纯函数单测
 *
 * 覆盖：
 *  - 默认值：按角色产出开箱即用设置（患者 vs 医护 vs 未知角色）；
 *  - 设置读写：分类级部分更新（mergeSettings）只改携带分类/字段，其余保留；
 *  - 分类管理：未携带分类原样保留、同分类字段级合并；
 *  - 脏数据兜底：非法主题/字号回退默认、非布尔收敛为 false、空白字符串 trim。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  getDefaultSettings,
  mergeSettings,
  sanitizeSettings,
  type Settings,
} from '../../src/bff/aggregators/userSettingsAggregator';

describe('getDefaultSettings 角色化默认值', () => {
  it('患者：只开站内+邮件通知，临床智能助手默认关闭', () => {
    const s = getDefaultSettings('patient');
    expect(s.notification).toEqual({ inApp: true, email: true, sms: false, sound: false });
    expect(s.assistant).toEqual({ enabled: false, autoSuggest: false });
    expect(s.appearance).toEqual({ theme: 'light', fontSize: 'medium' });
  });

  it('医生/护士/药师：通知与智能助手默认开启，提示音开', () => {
    for (const role of ['doctor', 'nurse', 'pharmacist', 'admin']) {
      const s = getDefaultSettings(role);
      expect(s.notification.sound).toBe(true);
      expect(s.assistant).toEqual({ enabled: true, autoSuggest: true });
    }
  });

  it('未知/空角色走医护安全默认值（浅色·中号·助手开）', () => {
    for (const role of [undefined, null, '', 'visitor']) {
      const s = getDefaultSettings(role);
      expect(s.appearance).toEqual({ theme: 'light', fontSize: 'medium' });
      expect(s.assistant.enabled).toBe(true);
    }
  });

  it('相同角色返回全新对象，不共享内部引用', () => {
    const a = getDefaultSettings('doctor');
    const b = getDefaultSettings('doctor');
    expect(a).toEqual(b);
    a.notification.sound = false;
    expect(b.notification.sound).toBe(true);
  });
});

describe('mergeSettings 分类级读写 / 分类管理', () => {
  const base = getDefaultSettings('doctor');

  it('只改某一分类时，其余分类原样保留', () => {
    const merged = mergeSettings(base, { notification: { sound: false } });
    // 被改分类生效
    expect(merged.notification.sound).toBe(false);
    // 未携带分类完全不变
    expect(merged.appearance).toEqual(base.appearance);
    expect(merged.assistant).toEqual(base.assistant);
    expect(merged.workspace).toEqual(base.workspace);
  });

  it('同一分类内字段级合并，未出现字段沿用基线', () => {
    const merged = mergeSettings(base, { appearance: { theme: 'dark' } });
    expect(merged.appearance.theme).toBe('dark');
    // 字号未在 patch 中，沿用基线 medium
    expect(merged.appearance.fontSize).toBe('medium');
  });

  it('多分类同时更新各自独立生效', () => {
    const merged = mergeSettings(base, {
      notification: { sms: true },
      workspace: { defaultDeptCode: 'DEPT-INTERNAL' },
    });
    expect(merged.notification.sms).toBe(true);
    expect(merged.workspace.defaultDeptCode).toBe('DEPT-INTERNAL');
    // 其它通知位保留
    expect(merged.notification.inApp).toBe(true);
  });

  it('patch 中的非法枚举被收敛回基线，不污染设置', () => {
    const merged = mergeSettings(base, {
      appearance: { theme: 'neon' as never, fontSize: 'xl' as never },
    });
    expect(merged.appearance.theme).toBe('light');
    expect(merged.appearance.fontSize).toBe('medium');
  });

  it('patch 为 null/undefined 时返回基线的合法拷贝', () => {
    expect(mergeSettings(base, null)).toEqual(base);
    expect(mergeSettings(base, undefined)).toEqual(base);
  });

  it('不修改入参 current', () => {
    const snapshot = JSON.stringify(base);
    mergeSettings(base, { notification: { sound: false } });
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe('sanitizeSettings 脏数据兜底', () => {
  const base = getDefaultSettings('doctor');

  it('非法主题/字号回退默认', () => {
    const s = sanitizeSettings(
      { appearance: { theme: '银河', fontSize: '超大' } },
      base,
    );
    expect(s.appearance.theme).toBe('light');
    expect(s.appearance.fontSize).toBe('medium');
  });

  it('非 true 值一律收敛为 false', () => {
    const s = sanitizeSettings(
      { assistant: { enabled: 'yes', autoSuggest: 1 } },
      base,
    );
    expect(s.assistant.enabled).toBe(false);
    expect(s.assistant.autoSuggest).toBe(false);
  });

  it('科室/病房编码做 trim，非字符串回退空串', () => {
    const s = sanitizeSettings(
      { workspace: { defaultDeptCode: '  DEPT-ICU  ', defaultWardCode: 123 } },
      base,
    );
    expect(s.workspace.defaultDeptCode).toBe('DEPT-ICU');
    expect(s.workspace.defaultWardCode).toBe('');
  });

  it('raw 为 null/undefined 返回与基线结构一致的合法对象', () => {
    const s1 = sanitizeSettings(null, base);
    const s2 = sanitizeSettings(undefined, base);
    expect(s1).toEqual(base);
    expect(s2).toEqual(base);
  });

  it('缺分类时用基线补全，不出现 undefined 分类', () => {
    const s = sanitizeSettings({ notification: { sound: false } } as Partial<Settings>, base);
    expect(s.appearance).toEqual(base.appearance);
    expect(s.assistant).toEqual(base.assistant);
    expect(s.workspace).toEqual(base.workspace);
  });
});
