/**
 * 健澜科技 jlmedaios - 个性化偏好与统一通知（M158-D · 用户体验深化）纯函数单测
 *
 * 覆盖：
 *  - 偏好构建：buildUserPreferences 开箱默认（主题/通知方式/默认首页/每页条数/助手开关五组齐全）；
 *  - 设置持久化：saveUserPreferences 部分更新即时生效，其余偏好原样保留；
 *  - 通知聚合：unifyNotifications 类型过滤、通道路由、时间倒序、全关通道即不打扰；
 *  - 通道派生：getNotificationSettings 由 notifyChannels 推导三通道布尔值；
 *  - 隔离与兜底：跨用户隔离；非法主题/条数/通道/首页/布尔值均收敛回合法值。
 *
 * 全部运行时内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';

import {
  __resetUserPrefStore,
  buildUserPreferences,
  defaultPreferences,
  getNotificationSettings,
  saveUserPreferences,
  unifyNotifications,
} from '../../src/bff/aggregators/userPrefAggregator';

beforeEach(() => {
  __resetUserPrefStore();
});

describe('偏好构建：开箱默认', () => {
  it('五组偏好齐全，主题深海蓝、仅站内通知、工作台、每页 20、助手全开', () => {
    const p = buildUserPreferences('u-001');
    expect(p).toEqual({
      theme: 'seaBlue',
      notifyChannels: ['inApp'],
      defaultHome: 'workbench',
      pageSize: 20,
      assistant: { aiAssist: true, voiceInput: true, smartTips: true },
    });
  });

  it('空 userId 也回退默认值，不抛错', () => {
    expect(buildUserPreferences('')).toEqual(defaultPreferences());
  });

  it('两次读取返回等值但互不影响的新对象', () => {
    const a = buildUserPreferences('u-002');
    const b = buildUserPreferences('u-002');
    expect(a).toEqual(b);
    a.theme = 'highContrast';
    a.notifyChannels.push('email');
    expect(b.theme).toBe('seaBlue');
    expect(b.notifyChannels).toEqual(['inApp']);
  });
});

describe('设置持久化：部分更新即时生效', () => {
  it('更新主题后，再次读取即生效，其余偏好原样保留', () => {
    saveUserPreferences('u-100', { theme: 'light' });
    const p = buildUserPreferences('u-100');
    expect(p.theme).toBe('light');
    expect(p.pageSize).toBe(20);
    expect(p.defaultHome).toBe('workbench');
    expect(p.assistant).toEqual({ aiAssist: true, voiceInput: true, smartTips: true });
  });

  it('助手开关可单键翻转，其余两个助手项保留', () => {
    saveUserPreferences('u-101', { assistant: { aiAssist: false } });
    const p = buildUserPreferences('u-101');
    expect(p.assistant.aiAssist).toBe(false);
    expect(p.assistant.voiceInput).toBe(true);
    expect(p.assistant.smartTips).toBe(true);
  });

  it('通知方式多选：叠加 email 后通道数 +1，重复不累积', () => {
    saveUserPreferences('u-102', { notifyChannels: ['inApp', 'email', 'email', 'sms'] });
    expect(buildUserPreferences('u-102').notifyChannels).toEqual(['inApp', 'email', 'sms']);
  });

  it('多字段一次提交各自生效', () => {
    saveUserPreferences('u-103', { defaultHome: 'cockpit', pageSize: 50 });
    const p = buildUserPreferences('u-103');
    expect(p.defaultHome).toBe('cockpit');
    expect(p.pageSize).toBe(50);
  });
});

describe('通道派生：getNotificationSettings', () => {
  it('默认仅 inApp 为真', () => {
    expect(getNotificationSettings('u-200')).toEqual({ inApp: true, email: false, sms: false });
  });

  it('开启邮件后 email 为真，站内仍在', () => {
    saveUserPreferences('u-201', { notifyChannels: ['inApp', 'email'] });
    expect(getNotificationSettings('u-201')).toEqual({ inApp: true, email: true, sms: false });
  });

  it('全部关闭后三通道均为假', () => {
    saveUserPreferences('u-202', { notifyChannels: [] });
    expect(getNotificationSettings('u-202')).toEqual({ inApp: false, email: false, sms: false });
  });
});

describe('通知聚合：unifyNotifications', () => {
  it('默认（仅站内）返回全部 4 条，按时间倒序', () => {
    const list = unifyNotifications('u-300');
    expect(list).toHaveLength(4);
    expect(list[0].id).toBe('ntf-cv-1001');
    expect(list[3].id).toBe('ntf-sys-4001');
    expect(list.every((n) => n.channel === 'inApp')).toBe(true);
  });

  it('类型白名单过滤：仅要危急值时只剩 criticalValue', () => {
    const list = unifyNotifications('u-301', ['criticalValue']);
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('criticalValue');
  });

  it('通道路由：只开邮件时，仅支持站内的待办被跳过', () => {
    saveUserPreferences('u-302', { notifyChannels: ['email'] });
    const list = unifyNotifications('u-302');
    const types = list.map((n) => n.type).sort();
    expect(types).toEqual(['consult', 'criticalValue', 'system']); // todo 仅支持站内，被跳过
    expect(list.every((n) => n.channel === 'email')).toBe(true);
  });

  it('全关通道后不打扰：收件箱为空', () => {
    saveUserPreferences('u-303', { notifyChannels: [] });
    expect(unifyNotifications('u-303')).toEqual([]);
  });

  it('返回深拷贝：外部回写不污染下次聚合结果', () => {
    const a = unifyNotifications('u-304');
    a[0].title = '篡改';
    a.push({} as (typeof a)[number]);
    expect(unifyNotifications('u-304')[0].title).not.toBe('篡改');
    expect(unifyNotifications('u-304')).toHaveLength(4);
  });
});

describe('隔离与兜底', () => {
  it('跨用户互不可见', () => {
    saveUserPreferences('u-A', { theme: 'highContrast', pageSize: 10 });
    saveUserPreferences('u-B', { defaultHome: 'patientList' });
    expect(buildUserPreferences('u-A').theme).toBe('highContrast');
    expect(buildUserPreferences('u-B').theme).toBe('seaBlue');
    expect(buildUserPreferences('u-A').pageSize).toBe(10);
  });

  it('非法主题/首页/条数收敛回默认', () => {
    saveUserPreferences('u-400', {
      theme: '星空紫' as never,
      defaultHome: 'admin' as never,
      pageSize: 99 as never,
    });
    const p = buildUserPreferences('u-400');
    expect(p.theme).toBe('seaBlue');
    expect(p.defaultHome).toBe('workbench');
    expect(p.pageSize).toBe(20);
  });

  it('通道数组里的非法项被丢弃', () => {
    saveUserPreferences('u-401', { notifyChannels: ['inApp', 'carrierPigeon' as never, 'email'] });
    expect(buildUserPreferences('u-401').notifyChannels).toEqual(['inApp', 'email']);
  });

  it('助手开关非 true 值一律 false', () => {
    saveUserPreferences('u-402', {
      assistant: { aiAssist: 'yes' as never, voiceInput: 1 as never, smartTips: true },
    });
    const a = buildUserPreferences('u-402').assistant;
    expect(a.aiAssist).toBe(false);
    expect(a.voiceInput).toBe(false);
    expect(a.smartTips).toBe(true);
  });
});
