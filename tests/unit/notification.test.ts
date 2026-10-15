/**
 * 健澜科技 jlmedaios - 医护统一消息通知中心（M134-C · 用户体验深化）纯函数单测
 *
 * 覆盖：
 *  - 通知发送：sendNotification 构造结构合法的未读通知，类型越界回退、
 *    staffId/title 必填抛错、link 空串归一为 null；
 *  - 已读未读：isUnread 依据 readAt 判定；
 *  - 筛选：filterNotifications 按类型 / 未读收敛；
 *  - 分页：paginateNotifications 切片正确、total 口径、页码条数兜底与上限。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  filterNotifications,
  isUnread,
  paginateNotifications,
  sendNotification,
  type Notification,
} from '../../src/bff/aggregators/notificationAggregator';

describe('sendNotification 通知发送（构造未读通知）', () => {
  it('四类合法类型原样保留，且为未读', () => {
    for (const type of ['todo_task', 'system_alert', 'experience_rec', 'peer_interact'] as const) {
      const n = sendNotification('11111111-1111-1111-1111-111111111111', type, '标题', '正文', '/x');
      expect(n.type).toBe(type);
      expect(n.readAt).toBeNull();
      expect(n.link).toBe('/x');
      expect(n.staffId).toBe('11111111-1111-1111-1111-111111111111');
      expect(n.title).toBe('标题');
      expect(n.content).toBe('正文');
      expect(typeof n.id).toBe('string');
      expect(n.id.length).toBeGreaterThan(0);
      expect(typeof n.createdAt).toBe('string');
    }
  });

  it('未知类型回退 system_alert，不抛错、不丢通知', () => {
    const n = sendNotification('u-1', 'weird_type' as never, '告警');
    expect(n.type).toBe('system_alert');
  });

  it('staffId 为空（含纯空白）直接抛错', () => {
    expect(() => sendNotification('   ', 'todo_task', '标题')).toThrow();
    expect(() => sendNotification('', 'todo_task', '标题')).toThrow();
  });

  it('title 为空（含纯空白）直接抛错', () => {
    expect(() => sendNotification('u-1', 'todo_task', '  ')).toThrow();
  });

  it('content 缺省为空串；link 空串 / 空白归一为 null', () => {
    const a = sendNotification('u-1', 'peer_interact', '标题');
    expect(a.content).toBe('');
    expect(a.link).toBeNull();

    const b = sendNotification('u-1', 'peer_interact', '标题', '', '   ');
    expect(b.link).toBeNull();
  });

  it('title / staffId 自动 trim，link 保留合法值', () => {
    const n = sendNotification('  u-1  ', '  todo_task  ', '  待办  ', '  正文  ', '  /task/9  ');
    expect(n.staffId).toBe('u-1');
    expect(n.title).toBe('待办');
    expect(n.content).toBe('正文');
    expect(n.link).toBe('/task/9');
  });
});

describe('isUnread 已读 / 未读判定', () => {
  it('readAt 为 null → 未读；非 null → 已读', () => {
    expect(isUnread({ readAt: null })).toBe(true);
    expect(isUnread({ readAt: '2026-10-16T00:00:00Z' })).toBe(false);
  });
});

describe('filterNotifications 类型 / 未读筛选', () => {
  const items: Notification[] = [
    sendNotification('u', 'todo_task', '待办1'),
    { ...sendNotification('u', 'system_alert', '告警1'), readAt: '2026-10-16T00:00:00Z' },
    sendNotification('u', 'experience_rec', '推荐1'),
    { ...sendNotification('u', 'peer_interact', '互动1'), readAt: '2026-10-16T00:00:00Z' },
  ];

  it('不指定条件时原样返回', () => {
    expect(filterNotifications(items)).toHaveLength(4);
    expect(filterNotifications(items, {})).toHaveLength(4);
  });

  it('按类型只保留匹配项', () => {
    expect(filterNotifications(items, { type: 'todo_task' })).toHaveLength(1);
    expect(filterNotifications(items, { type: 'system_alert' })[0].title).toBe('告警1');
  });

  it('unreadOnly=true 只保留未读（readAt 为 null）', () => {
    const unread = filterNotifications(items, { unreadOnly: true });
    expect(unread).toHaveLength(2);
    expect(unread.every((n) => n.readAt === null)).toBe(true);
  });

  it('类型 + 未读叠加筛选', () => {
    const r = filterNotifications(items, { type: 'peer_interact', unreadOnly: true });
    expect(r).toHaveLength(0); // 互动1 已读
    const r2 = filterNotifications(items, { type: 'todo_task', unreadOnly: true });
    expect(r2).toHaveLength(1);
  });
});

describe('paginateNotifications 筛选后分页', () => {
  // 造 25 条，前 1 条已读
  const items: Notification[] = Array.from({ length: 25 }, (_, i) =>
    i === 0
      ? { ...sendNotification('u', 'todo_task', `#${i}`), readAt: '2026-10-16T00:00:00Z' }
      : sendNotification('u', 'todo_task', `#${i}`),
  );

  it('默认 page=1 / pageSize=20，返回前 20 条、total=25', () => {
    const r = paginateNotifications(items);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.total).toBe(25);
    expect(r.items).toHaveLength(20);
  });

  it('第 2 页取剩余 5 条', () => {
    const r = paginateNotifications(items, 2, 20);
    expect(r.items).toHaveLength(5);
    expect(r.total).toBe(25);
  });

  it('自定义 pageSize 生效', () => {
    const r = paginateNotifications(items, 1, 10);
    expect(r.items).toHaveLength(10);
    expect(r.total).toBe(25);
  });

  it('非法页码 / 条数收敛为安全默认', () => {
    const r = paginateNotifications(items, 0, -5);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
  });

  it('pageSize 上限 100，防止一次拉爆', () => {
    const r = paginateNotifications(items, 1, 9999);
    expect(r.pageSize).toBe(100);
    expect(r.items).toHaveLength(25);
  });

  it('空列表分页安全', () => {
    const r = paginateNotifications([], 1, 20);
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });
});
