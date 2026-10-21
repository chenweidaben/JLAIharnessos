/**
 * 健澜科技 jlmedaios - M524 新标准 P0：医嘱闭环状态机监控 3 端点
 *
 * order/instances 医嘱实例（状态机全链路）、order/pending-review 待审核医嘱、order/stats 医嘱闭环统计。
 * 走 order/ 新前缀；与 M523 /dict/*、M522 /dict/*、M502 /prescription/*、/outpatient/* 路由区分。
 *
 * 业务流程闭环纪律：开立 created → 审核 reviewed → 执行 executed → 回录 recorded，状态机不可越级；
 * rejected/cancelled 为终态；各环节操作人 + ISO8601 时间戳随状态联动，未到环节字段为 null。
 * 枚举英文 key，数值 number，布尔 boolean，日期 ISO8601；禁止中文标签拼字符串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/order/instances - 医嘱实例（状态机全链路，环节时间戳/操作人闭环，未到环节为 null）5 条 */
async function handleOrderInstances(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    // status=recorded：审核/执行/回录三环节全部非空（完整闭环）
    {
      id: 'ORD-001',
      patient: '张**',
      orderType: 'drug' as const,
      status: 'recorded' as const,
      dept: '心血管内科',
      creator: '王建国',
      createdAt: '2026-10-21T08:15:00+08:00',
      reviewer: '刘药师',
      reviewedAt: '2026-10-21T08:22:00+08:00',
      executor: '李护士',
      executedAt: '2026-10-21T09:00:00+08:00',
      recorder: '李护士',
      recordedAt: '2026-10-21T09:05:00+08:00',
    },
    // status=executed：审核、执行非空，回录环节未到（null）
    {
      id: 'ORD-002',
      patient: '李**',
      orderType: 'lab' as const,
      status: 'executed' as const,
      dept: '消化内科',
      creator: '陈医师',
      createdAt: '2026-10-21T08:40:00+08:00',
      reviewer: '刘药师',
      reviewedAt: '2026-10-21T08:46:00+08:00',
      executor: '赵技师',
      executedAt: '2026-10-21T09:20:00+08:00',
      recorder: null,
      recordedAt: null,
    },
    // status=reviewed：审核非空，执行/回录未到（null）
    {
      id: 'ORD-003',
      patient: '王**',
      orderType: 'exam' as const,
      status: 'reviewed' as const,
      dept: '骨科',
      creator: '孙医师',
      createdAt: '2026-10-21T09:05:00+08:00',
      reviewer: '周药师',
      reviewedAt: '2026-10-21T09:12:00+08:00',
      executor: null,
      executedAt: null,
      recorder: null,
      recordedAt: null,
    },
    // status=created：仅开立，后续环节全部 null
    {
      id: 'ORD-004',
      patient: '赵**',
      orderType: 'nursing' as const,
      status: 'created' as const,
      dept: '呼吸内科',
      creator: '钱护士',
      createdAt: '2026-10-21T09:30:00+08:00',
      reviewer: null,
      reviewedAt: null,
      executor: null,
      executedAt: null,
      recorder: null,
      recordedAt: null,
    },
    // status=rejected：终态，审核驳回，后续执行/回录未到（null）
    {
      id: 'ORD-005',
      patient: '孙**',
      orderType: 'drug' as const,
      status: 'rejected' as const,
      dept: '神经内科',
      creator: '吴医师',
      createdAt: '2026-10-21T07:50:00+08:00',
      reviewer: '周药师',
      reviewedAt: '2026-10-21T07:58:00+08:00',
      executor: null,
      executedAt: null,
      recorder: null,
      recordedAt: null,
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/order/pending-review - 待审核医嘱（creatorRole 英文枚举，waitMin number）5 条 */
async function handleOrderPendingReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PR-001', patient: '张**', orderType: 'drug' as const, creator: '王建国', creatorRole: 'physician' as const, createdAt: '2026-10-21T09:31:00+08:00', waitMin: 2, dept: '心血管内科' },
    { id: 'PR-002', patient: '李**', orderType: 'drug' as const, creator: '陈医师', creatorRole: 'physician' as const, createdAt: '2026-10-21T09:18:00+08:00', waitMin: 15, dept: '消化内科' },
    { id: 'PR-003', patient: '王**', orderType: 'lab' as const, creator: '孙医师', creatorRole: 'physician' as const, createdAt: '2026-10-21T09:05:00+08:00', waitMin: 28, dept: '骨科' },
    { id: 'PR-004', patient: '赵**', orderType: 'nursing' as const, creator: '钱护士', creatorRole: 'nurse' as const, createdAt: '2026-10-21T09:30:00+08:00', waitMin: 3, dept: '呼吸内科' },
    { id: 'PR-005', patient: '孙**', orderType: 'surgery' as const, creator: '郑医师', creatorRole: 'physician' as const, createdAt: '2026-10-21T08:50:00+08:00', waitMin: 43, dept: '普外科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/order/stats - 医嘱闭环统计（全部 number，date ISO 日期）5 条 */
async function handleOrderStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OS-001', dept: '心血管内科', totalOrders: 1280, reviewedCount: 1256, executedCount: 1218, recordedCount: 1202, rejectionRate: 1.9, avgReviewMin: 6.5, date: '2026-10-21' },
    { id: 'OS-002', dept: '消化内科', totalOrders: 986, reviewedCount: 962, executedCount: 931, recordedCount: 918, rejectionRate: 2.4, avgReviewMin: 7.2, date: '2026-10-21' },
    { id: 'OS-003', dept: '骨科', totalOrders: 742, reviewedCount: 721, executedCount: 698, recordedCount: 686, rejectionRate: 2.8, avgReviewMin: 8.1, date: '2026-10-21' },
    { id: 'OS-004', dept: '呼吸内科', totalOrders: 815, reviewedCount: 796, executedCount: 770, recordedCount: 761, rejectionRate: 2.3, avgReviewMin: 6.9, date: '2026-10-21' },
    { id: 'OS-005', dept: '普外科', totalOrders: 668, reviewedCount: 649, executedCount: 628, recordedCount: 619, rejectionRate: 2.8, avgReviewMin: 7.8, date: '2026-10-21' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m524Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/order/instances', handle: handleOrderInstances, auth: true },
  { method: 'GET', path: '/api/v1/order/pending-review', handle: handleOrderPendingReview, auth: true },
  { method: 'GET', path: '/api/v1/order/stats', handle: handleOrderStats, auth: true },
];
