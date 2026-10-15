/**
 * 健澜科技 jlmedaios - 统一通知中心（M148-B · 产品化收尾）纯函数单测
 *
 * 覆盖：
 *  - 推送 pushNotification：构造结构合法的未读通知，类型越界回退、
 *    staffId/title 必填抛错、refType/refId 空串归一为 null、入参自动 trim；
 *  - 分页 getUnifiedNotifications：只返回本人通知、按大类筛选、切片正确、
 *    total 口径、页码条数兜底与上限、倒序；
 *  - 已读 markNotificationRead：置 readAt、未读数下降、已读不回退、
 *    越权 / 未命中抛错；
 *  - 未读数 unread：跨大类统计未读总数（供铃铛角标），已读后下降。
 *
 * 全部内存仓，不依赖数据库；每个用例前 resetUnifiedNotifications 隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';

import {
  getUnifiedNotifications,
  markNotificationRead,
  pushNotification,
  resetUnifiedNotifications,
  type UnifiedNotificationType,
} from '../../src/bff/aggregators/notificationCenterAggregator';

const S1 = '11111111-1111-1111-1111-111111111111';
const S2 = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  resetUnifiedNotifications();
});

describe('pushNotification 推送（构造并写入未读通知）', () => {
  it('四类合法类型原样保留，且为未读、携带引用', () => {
    for (const type of ['todo', 'alert', 'recommend', 'interact'] as const) {
      const n = pushNotification(S1, type, '标题', '正文', 'order_review', 'ord-9');
      expect(n.type).toBe(type);
      expect(n.readAt).toBeNull();
      expect(n.staffId).toBe(S1);
      expect(n.title).toBe('标题');
      expect(n.content).toBe('正文');
      expect(n.refType).toBe('order_review');
      expect(n.refId).toBe('ord-9');
      expect(typeof n.id).toBe('string');
      expect(n.id.length).toBeGreaterThan(0);
      expect(typeof n.createdAt).toBe('string');
    }
  });

  it('未知类型回退 todo，不抛错、不丢通知', () => {
    const n = pushNotification(S1, 'weird_type' as never, '一条消息');
    expect(n.type).toBe('todo');
  });

  it('staffId 为空（含纯空白）直接抛错', () => {
    expect(() => pushNotification('   ', 'todo', '标题')).toThrow();
    expect(() => pushNotification('', 'todo', '标题')).toThrow();
  });

  it('title 为空（含纯空白）直接抛错', () => {
    expect(() => pushNotification(S1, 'todo', '  ')).toThrow();
  });

  it('content 缺省为空串；refType / refId 空串 / 空白归一为 null', () => {
    const a = pushNotification(S1, 'interact', '标题');
    expect(a.content).toBe('');
    expect(a.refType).toBeNull();
    expect(a.refId).toBeNull();

    const b = pushNotification(S1, 'interact', '标题', '', '   ', '  ');
    expect(b.refType).toBeNull();
    expect(b.refId).toBeNull();
  });

  it('staffId / title / content 自动 trim，ref 保留合法值', () => {
    const n = pushNotification('  u-1  ', '  todo  ', '  待办  ', '  正文  ', '  mention  ', '  m-1  ');
    expect(n.staffId).toBe('u-1');
    expect(n.title).toBe('待办');
    expect(n.content).toBe('正文');
    expect(n.refType).toBe('mention');
    expect(n.refId).toBe('m-1');
  });
});

describe('getUnifiedNotifications 分页 / 筛选 / 隔离', () => {
  it('只返回本人通知，不串号他人', () => {
    pushNotification(S1, 'todo', '给S1的待办');
    pushNotification(S2, 'alert', '给S2的告警');
    const p1 = getUnifiedNotifications(S1);
    const p2 = getUnifiedNotifications(S2);
    expect(p1.items).toHaveLength(1);
    expect(p1.items[0].title).toBe('给S1的待办');
    expect(p2.items).toHaveLength(1);
    expect(p2.items[0].title).toBe('给S2的告警');
  });

  it('按大类筛选：type 缺省全部；指定只保留匹配项', () => {
    pushNotification(S1, 'todo', '待办1');
    pushNotification(S1, 'alert', '告警1');
    pushNotification(S1, 'recommend', '推荐1');
    pushNotification(S1, 'interact', '互动1');

    expect(getUnifiedNotifications(S1).total).toBe(4);
    expect(getUnifiedNotifications(S1, 'todo').total).toBe(1);
    expect(getUnifiedNotifications(S1, 'alert').items[0].title).toBe('告警1');
    expect(getUnifiedNotifications(S1, 'recommend' as UnifiedNotificationType).total).toBe(1);
  });

  it('非法 type 等同于不按类型过滤', () => {
    pushNotification(S1, 'todo', '待办1');
    pushNotification(S1, 'alert', '告警1');
    const p = getUnifiedNotifications(S1, 'bogus' as never);
    expect(p.total).toBe(2);
  });

  it('默认 page=1 / pageSize=20，分页切片正确、倒序', () => {
    for (let i = 0; i < 25; i += 1) {
      pushNotification(S1, 'todo', `#${i}`);
    }
    const p1 = getUnifiedNotifications(S1);
    expect(p1.page).toBe(1);
    expect(p1.pageSize).toBe(20);
    expect(p1.total).toBe(25);
    expect(p1.items).toHaveLength(20);
    // 倒序：最新推送的 #24 排最前
    expect(p1.items[0].title).toBe('#24');

    const p2 = getUnifiedNotifications(S1, undefined, 2, 20);
    expect(p2.items).toHaveLength(5);
    expect(p2.items[0].title).toBe('#4');
  });

  it('自定义 pageSize 生效；pageSize 上限 100；非法页码收敛为 1', () => {
    for (let i = 0; i < 25; i += 1) pushNotification(S1, 'todo', `#${i}`);
    expect(getUnifiedNotifications(S1, undefined, 1, 10).items).toHaveLength(10);
    expect(getUnifiedNotifications(S1, undefined, 1, 9999).pageSize).toBe(100);
    expect(getUnifiedNotifications(S1, undefined, 0, -5).page).toBe(1);
  });

  it('staffId 为空 / 无通知时返回空 Page，不抛错', () => {
    const empty = getUnifiedNotifications('');
    expect(empty.items).toEqual([]);
    expect(empty.total).toBe(0);
    expect(empty.unread).toBe(0);
  });
});

describe('markNotificationRead 已读', () => {
  it('置 readAt 后返回更新后的通知，且再次读取不回退', () => {
    const n = pushNotification(S1, 'todo', '待审医嘱');
    expect(n.readAt).toBeNull();

    const updated = markNotificationRead(n.id, S1);
    expect(updated.readAt).not.toBeNull();

    // 再次标记（已读）不回退
    const again = markNotificationRead(n.id, S1);
    expect(again.readAt).toBe(updated.readAt);
  });

  it('非本人 / 不存在的通知抛错（越权在纯函数层表达）', () => {
    const n = pushNotification(S1, 'todo', '待审医嘱');
    expect(() => markNotificationRead(n.id, S2)).toThrow();
    expect(() => markNotificationRead('not-exist-id', S1)).toThrow();
  });
});

describe('未读数 unread（铃铛角标口径）', () => {
  it('统计该接收人跨大类未读总数；已读后下降', () => {
    pushNotification(S1, 'todo', '待办1');
    pushNotification(S1, 'alert', '告警1');
    pushNotification(S1, 'interact', '互动1');
    // S2 的未读不应计入 S1
    pushNotification(S2, 'alert', '给S2的告警');

    let page = getUnifiedNotifications(S1);
    expect(page.unread).toBe(3);

    // 把 S1 的一条待办置已读
    const todo = getUnifiedNotifications(S1, 'todo').items[0];
    markNotificationRead(todo.id, S1);

    page = getUnifiedNotifications(S1);
    expect(page.unread).toBe(2);

    // 按大类筛选时 total 受影响，但 unread 仍是跨大类总数
    page = getUnifiedNotifications(S1, 'todo');
    expect(page.total).toBe(1);
    expect(page.unread).toBe(2);
  });
});
