/**
 * 健澜科技 jlmedaios - 系统设置与个人偏好（M148-A · 产品化收尾）纯函数单测
 *
 * 覆盖：
 *  - 默认值：从未设置过的员工拿到开箱默认偏好（通知/界面/助手/工作台四类齐全）；
 *  - 偏好读取：getUserSettings 返回深拷贝，外部回写不污染库内状态；
 *  - 偏好更新：updateUserSetting 按扁平键单键生效，其余偏好原样保留；
 *  - 员工隔离：A 的更新不影响 B；
 *  - 兜底：未知 key / 非法枚举 / 非布尔值 / 脏列表均收敛回合法值。
 *
 * 全部运行时内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';

import {
  __resetUserSettingsStore,
  defaultSettings,
  getUserSettings,
  isValidSettingKey,
  updateUserSetting,
} from '../../src/bff/aggregators/userSettingsAggregator';

beforeEach(() => {
  __resetUserSettingsStore();
});

describe('默认值：从未设置的员工开箱偏好', () => {
  it('四类偏好齐全，通知仅默认站内信开', () => {
    const s = getUserSettings('staff-001');
    expect(s.notification).toEqual({ sms: false, wechat: false, inApp: true });
  });

  it('界面默认深海蓝 / 中号字 / 标准密度', () => {
    const s = getUserSettings('staff-001');
    expect(s.appearance).toEqual({ themeColor: 'seaBlue', fontSize: 'medium', density: 'normal' });
  });

  it('助手默认开启、建议展示；工作台默认首页工作台、无置顶', () => {
    const s = getUserSettings('staff-001');
    expect(s.assistant).toEqual({ aiEnabled: true, suggestVisible: true });
    expect(s.workspace).toEqual({ defaultHome: 'workbench', pinnedFavorites: [] });
  });

  it('空 staffId 也回退默认值，不抛错', () => {
    expect(getUserSettings('')).toEqual(defaultSettings());
  });
});

describe('偏好读取：深拷贝隔离', () => {
  it('两次读取返回等值但互不影响的新对象', () => {
    const a = getUserSettings('staff-002');
    const b = getUserSettings('staff-002');
    expect(a).toEqual(b);
    a.notification.sms = true;
    a.workspace.pinnedFavorites.push('orders');
    expect(b.notification.sms).toBe(false);
    expect(b.workspace.pinnedFavorites).toEqual([]);
  });

  it('getUserSettings 不写库：读取后再更新，只走一次更新路径', () => {
    getUserSettings('staff-003');
    const after = updateUserSetting('staff-003', 'notification.sms', true);
    expect(after.notification.sms).toBe(true);
  });
});

describe('偏好更新：单键即时生效', () => {
  it('开启短信通知后，再次读取即生效', () => {
    updateUserSetting('staff-100', 'notification.sms', true);
    expect(getUserSettings('staff-100').notification.sms).toBe(true);
  });

  it('更新一个键时，其余偏好原样保留', () => {
    const before = getUserSettings('staff-101');
    updateUserSetting('staff-101', 'appearance.fontSize', 'large');
    const after = getUserSettings('staff-101');
    expect(after.appearance.fontSize).toBe('large');
    expect(after.appearance.themeColor).toBe(before.appearance.themeColor);
    expect(after.notification).toEqual(before.notification);
    expect(after.assistant).toEqual(before.assistant);
    expect(after.workspace).toEqual(before.workspace);
  });

  it('更新返回值即更新后的完整偏好，且后续读取一致', () => {
    const updated = updateUserSetting('staff-102', 'workspace.defaultHome', 'todos');
    expect(updated.workspace.defaultHome).toBe('todos');
    expect(getUserSettings('staff-102').workspace.defaultHome).toBe('todos');
  });

  it('常用功能置顶：自动 trim、去重、截断 12 个', () => {
    updateUserSetting('staff-103', 'workspace.pinnedFavorites', [
      ' orders ',
      'emr',
      'emr',
      123,
      ...Array.from({ length: 20 }, (_, i) => `fn-${i}`),
    ]);
    const pinned = getUserSettings('staff-103').workspace.pinnedFavorites;
    expect(pinned[0]).toBe('orders');
    expect(pinned.filter((x) => x === 'emr')).toHaveLength(1);
    expect(pinned).not.toContain(123);
    expect(pinned.length).toBeLessThanOrEqual(12);
  });

  it('多键连续更新各自独立生效', () => {
    updateUserSetting('staff-104', 'notification.wechat', true);
    updateUserSetting('staff-104', 'assistant.aiEnabled', false);
    updateUserSetting('staff-104', 'appearance.density', 'compact');
    const s = getUserSettings('staff-104');
    expect(s.notification.wechat).toBe(true);
    expect(s.assistant.aiEnabled).toBe(false);
    expect(s.appearance.density).toBe('compact');
  });
});

describe('员工隔离：A 的更新不影响 B', () => {
  it('跨 staffId 互不可见', () => {
    updateUserSetting('staff-A', 'notification.sms', true);
    updateUserSetting('staff-B', 'appearance.themeColor', 'violet');
    const a = getUserSettings('staff-A');
    const b = getUserSettings('staff-B');
    expect(a.notification.sms).toBe(true);
    expect(b.notification.sms).toBe(false);
    expect(b.appearance.themeColor).toBe('violet');
    expect(a.appearance.themeColor).toBe('seaBlue');
  });
});

describe('兜底：非法键 / 非法值收敛', () => {
  it('isValidSettingKey 白名单判定', () => {
    expect(isValidSettingKey('notification.sms')).toBe(true);
    expect(isValidSettingKey('appearance.unknown')).toBe(false);
    expect(isValidSettingKey('hacker.admin')).toBe(false);
  });

  it('未知 key 不写库、原样返回默认偏好', () => {
    const before = getUserSettings('staff-200');
    const after = updateUserSetting('staff-200', 'hacker.admin' as never, true);
    expect(after).toEqual(before);
    expect(getUserSettings('staff-200')).toEqual(before);
  });

  it('非 true 值收敛为 false', () => {
    updateUserSetting('staff-201', 'assistant.suggestVisible', 'yes');
    updateUserSetting('staff-201', 'notification.inApp', 1);
    const s = getUserSettings('staff-201');
    expect(s.assistant.suggestVisible).toBe(false);
    expect(s.notification.inApp).toBe(false);
  });

  it('非法枚举回退默认', () => {
    updateUserSetting('staff-202', 'appearance.themeColor', '银河' as never);
    updateUserSetting('staff-202', 'appearance.fontSize', 'xxl' as never);
    updateUserSetting('staff-202', 'appearance.density', '超宽' as never);
    updateUserSetting('staff-202', 'workspace.defaultHome', 'admin' as never);
    const s = getUserSettings('staff-202');
    expect(s.appearance.themeColor).toBe('seaBlue');
    expect(s.appearance.fontSize).toBe('medium');
    expect(s.appearance.density).toBe('normal');
    expect(s.workspace.defaultHome).toBe('workbench');
  });
});
