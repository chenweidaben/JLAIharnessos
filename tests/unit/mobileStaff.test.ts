/**
 * 健澜科技 jlmedaios - 医生移动工作站纯函数单测（M158-B，v4.x近期）
 *
 * 标签 M158B_TEST。覆盖：
 *  - buildMobileStaffHome：医生角色下发写交班/下医嘱/开检查，非医生不下发；
 *  - optimizeForMobile：患者按病情排序封顶、通知危急优先+按 key 去重、脏行剔除；
 *  - registerPushToken：合法令牌通过且 dedupKey 稳定，非法平台/长度/字符拒绝。
 *
 * 纯函数、不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  buildMobileStaffHome,
  optimizeForMobile,
  registerPushToken,
} from '../../src/bff/aggregators/mobileStaffAggregator.js';

describe('M158B_TEST buildMobileStaffHome 首页骨架', () => {
  it('医生：下发写交班/下医嘱/开检查三个快捷操作', () => {
    const home = buildMobileStaffHome('u_doc_01', 'doctor');
    expect(home.staffId).toBe('u_doc_01');
    expect(home.role).toBe('doctor');
    const labels = home.quickActions.map((a) => a.label);
    expect(labels).toEqual(expect.arrayContaining(['写交班', '下医嘱', '开检查']));
    expect(home.quickActions.length).toBe(3);
  });

  it('今日待办固定为待审医嘱/待查房/待病历', () => {
    const home = buildMobileStaffHome('u_doc_01', 'doctor');
    const keys = home.todos.map((t) => t.key);
    expect(keys).toEqual(['order_review', 'rounds', 'chart']);
    expect(home.todoTotal).toBe(0);
  });

  it('消息通知固定三个频道：危急值/会诊/审批', () => {
    const home = buildMobileStaffHome('u_doc_01', 'doctor');
    const types = home.notifications.map((n) => n.type);
    expect(types).toEqual(['critical_value', 'consult', 'approval']);
  });

  it('非医生角色（nurse/admin/unknown）不下发医生写操作', () => {
    for (const role of ['nurse', 'admin', 'unknown']) {
      const home = buildMobileStaffHome('u_x', role);
      expect(home.quickActions).toEqual([]);
      // 待办与通知骨架仍在（任何医护都要看到）
      expect(home.todos.length).toBe(3);
      expect(home.notifications.length).toBe(3);
    }
  });

  it('移动端布局：单列 + 大触摸目标 + 大字号', () => {
    const home = buildMobileStaffHome('u_doc_01', 'doctor');
    expect(home.layout).toMatchObject({
      columns: 1,
      largeTouchTarget: true,
      fontSize: 'large',
    });
  });
});

describe('M158B_TEST optimizeForMobile 移动端数据优化', () => {
  it('患者：无 visitId 的脏行被剔除', () => {
    const out = optimizeForMobile({
      patients: [
        { visitId: 'v1', nameMasked: '张*三', bedNo: '1床', acuity: 2 },
        { nameMasked: '无就诊号' } as never,
        { visitId: 'v2', nameMasked: '李*四', bedNo: '2床', acuity: 1 },
      ],
    });
    expect(out.patients.map((p) => p.visitId)).toEqual(['v1', 'v2']);
    expect(out.totals.patients).toBe(3);
  });

  it('患者：病情等级降序、同级按床号升序', () => {
    const out = optimizeForMobile({
      patients: [
        { visitId: 'v1', nameMasked: 'A', bedNo: '3床', acuity: 2 },
        { visitId: 'v2', nameMasked: 'B', bedNo: '1床', acuity: 5 },
        { visitId: 'v3', nameMasked: 'C', bedNo: '2床', acuity: 5 },
      ],
    });
    expect(out.patients.map((p) => p.visitId)).toEqual(['v2', 'v3', 'v1']);
  });

  it('患者列表封顶 20 条并标记 truncated', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      visitId: `v${i}`,
      nameMasked: `P${i}`,
      bedNo: `${i}床`,
      acuity: 1,
    }));
    const out = optimizeForMobile({ patients: many });
    expect(out.patients.length).toBe(20);
    expect(out.totals.patients).toBe(25);
    expect(out.truncated).toBe(true);
  });

  it('通知：危急值 > 会诊 > 审批 排序', () => {
    const out = optimizeForMobile({
      notifications: [
        { key: 'n1', type: 'approval', title: '审批', level: 'low', time: '2026-10-16 10:00' },
        { key: 'n2', type: 'critical_value', title: '危急值', level: 'high', time: '2026-10-16 09:00' },
        { key: 'n3', type: 'consult', title: '会诊', level: 'mid', time: '2026-10-16 08:00' },
      ],
    });
    expect(out.notifications.map((n) => n.type)).toEqual(['critical_value', 'consult', 'approval']);
  });

  it('通知：同 key 去重（保留后出现的），且封顶 5 条', () => {
    const out = optimizeForMobile({
      notifications: [
        { key: 'dup', type: 'consult', title: '旧', level: 'mid', time: '08:00' },
        { key: 'dup', type: 'consult', title: '新', level: 'mid', time: '09:00' },
        ...Array.from({ length: 6 }, (_, i) => ({
          key: `n${i}`,
          type: 'approval',
          title: `审批${i}`,
          level: 'low' as const,
          time: `0${i}:00`,
        })),
      ],
    });
    const dups = out.notifications.filter((n) => n.key === 'dup');
    expect(dups.length).toBe(1);
    expect(dups[0].title).toBe('新');
    expect(out.notifications.length).toBeLessThanOrEqual(5);
  });
});

describe('M158B_TEST registerPushToken 推送令牌校验', () => {
  it('合法 APNs 风格令牌 → registered，dedupKey 稳定', () => {
    const t = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    const r1 = registerPushToken('u_doc_01', t, 'ios');
    const r2 = registerPushToken('u_doc_01', t, 'ios');
    expect(r1.status).toBe('registered');
    expect(r1.platform).toBe('ios');
    expect(r1.dedupKey).toMatch(/^[0-9a-f]{8}$/);
    expect(r1.dedupKey).toBe(r2.dedupKey);
  });

  it('FCM / web 平台均接受', () => {
    expect(registerPushToken('u1', 'fcm-token-abcdef123', 'android').status).toBe('registered');
    expect(registerPushToken('u1', 'https://push.example.endpoint/abcdef', 'web').status).toBe(
      'registered',
    );
  });

  it('不支持的平台 → rejected', () => {
    const r = registerPushToken('u1', 'a1b2c3d4e5f6', 'harmonyos');
    expect(r.status).toBe('rejected');
    expect(r.reason).toContain('平台');
  });

  it('空 staffId → rejected', () => {
    const r = registerPushToken('', 'a1b2c3d4e5f6', 'ios');
    expect(r.status).toBe('rejected');
    expect(r.reason).toContain('staffId');
  });

  it('令牌过短/过长 → rejected', () => {
    expect(registerPushToken('u1', 'short', 'ios').status).toBe('rejected');
    expect(registerPushToken('u1', 'x'.repeat(201), 'ios').status).toBe('rejected');
  });

  it('令牌含非法字符（空格/中文）→ rejected', () => {
    const r = registerPushToken('u1', 'a1b2c3d4 中文', 'ios');
    expect(r.status).toBe('rejected');
    expect(r.reason).toContain('非法字符');
  });
});
