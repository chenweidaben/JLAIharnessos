/**
 * 健澜科技 jlmedaios - M350 P0 合规改造：事件总线深度打磨
 *
 * 事件列表/类型/订阅者/发布/消费者/指标详情（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/events/list - 事件列表 5 条 */
async function handleEventsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EL-001', eventId: 'EVT-2026-10-20-000001', type: '病历提交事件（medical.record.submitted）', time: '2026-10-20 09:30:00', status: '已投递（下游服务已接收并处理）', source: '病历模块（medical-records）' },
    { id: 'EL-002', eventId: 'EVT-2026-10-20-000002', type: '处方审核事件（prescription.audited）', time: '2026-10-20 10:00:00', status: '已投递（下游服务已接收并处理）', source: '处方模块（prescriptions）' },
    { id: 'EL-003', eventId: 'EVT-2026-10-20-000003', type: '出院结算事件（billing.settled）', time: '2026-10-20 11:00:00', status: '重试中（第 1 次发送失败，第 2 次重试中）', source: '收费模块（billing）' },
    { id: 'EL-004', eventId: 'EVT-2026-10-20-000004', type: '检验结果推送事件（lab.result.pushed）', time: '2026-10-20 14:00:00', status: '已进入死信队列（重试 3 次均失败）', source: '检验模块（lab）' },
    { id: 'EL-005', eventId: 'EVT-2026-10-20-000005', type: '影像报告推送事件（imaging.report.pushed）', time: '2026-10-20 15:00:00', status: '已投递（下游服务已接收并处理）', source: '影像模块（radiology）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/types - 事件类型 5 条 */
async function handleEventsTypes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ET-001', typeName: '病历事件（medical.*）', description: '病历相关事件（提交、修改、审核、归档等）', count: '今日已发送 500+ 条（病历提交 300+、病历修改 200+）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'ET-002', typeName: '处方事件（prescription.*）', description: '处方相关事件（开具、审核、调配、发药等）', count: '今日已发送 800+ 条（处方开具 500+、处方审核 300+）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'ET-003', typeName: '收费事件（billing.*）', description: '收费相关事件（收费、结算、退费、发票等）', count: '今日已发送 300+ 条（收费 200+、结算 100+）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'ET-004', typeName: '检验事件（lab.*）', description: '检验相关事件（医嘱、结果、报告等）', count: '今日已发送 600+ 条（检验医嘱 400+、检验结果 200+）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'ET-005', typeName: '影像事件（imaging.*）', description: '影像相关事件（医嘱、结果、报告等）', count: '今日已发送 400+ 条（影像医嘱 250+、影像结果 150+）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/subscribers - 事件订阅者 5 条 */
async function handleEventsSubscribers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ESU-001', subscriberName: '药房系统（pharmacy-service）', subscribedEvents: '处方开具事件（prescription.created）、处方审核事件（prescription.audited）', status: '在线（正常运行）', lastHeartbeat: '2026-10-20 15:00:00（最近 1 分钟内）', location: '192.168.1.100:8081（药房服务器）' },
    { id: 'ESU-002', subscriberName: '收费系统（billing-service）', subscribedEvents: '病历提交事件（medical.record.submitted）、出院结算事件（billing.settled）', status: '在线（正常运行）', lastHeartbeat: '2026-10-20 15:00:00（最近 1 分钟内）', location: '192.168.1.101:8082（收费服务器）' },
    { id: 'ESU-003', subscriberName: 'LIS 系统（lab-service）', subscribedEvents: '检验医嘱事件（lab.order.created）、检验结果事件（lab.result.pushed）', status: '离线（已停止运行）', lastHeartbeat: '2026-10-20 14:00:00（1 小时前，已超过心跳超时阈值）', location: '192.168.1.102:8083（LIS 服务器）' },
    { id: 'ESU-004', subscriberName: 'PACS 系统（imaging-service）', subscribedEvents: '影像医嘱事件（imaging.order.created）、影像报告事件（imaging.report.pushed）', status: '在线（正常运行）', lastHeartbeat: '2026-10-20 15:00:00（最近 1 分钟内）', location: '192.168.1.103:8084（PACS 服务器）' },
    { id: 'ESU-005', subscriberName: '数据仓库（data-warehouse）', subscribedEvents: '所有事件（通配符 *）', status: '在线（正常运行）', lastHeartbeat: '2026-10-20 15:00:00（最近 1 分钟内）', location: '192.168.1.104:8085（数据仓库服务器）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/publish - 事件发布 5 条 */
async function handleEventsPublish(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EP-001', publisherName: '病历模块（medical-records）', publishedEvents: '病历提交事件（medical.record.submitted）、病历修改事件（medical.record.updated）', status: '在线（正常运行）', lastPublish: '2026-10-20 15:00:00（最近 1 分钟内）', throughput: '50 条/秒（今日平均发布速率）' },
    { id: 'EP-002', publisherName: '处方模块（prescriptions）', publishedEvents: '处方开具事件（prescription.created）、处方审核事件（prescription.audited）', status: '在线（正常运行）', lastPublish: '2026-10-20 15:00:00（最近 1 分钟内）', throughput: '80 条/秒（今日平均发布速率）' },
    { id: 'EP-003', publisherName: '收费模块（billing）', publishedEvents: '出院结算事件（billing.settled）、退费事件（billing.refunded）', status: '在线（正常运行）', lastPublish: '2026-10-20 14:50:00（最近 10 分钟内）', throughput: '30 条/秒（今日平均发布速率）' },
    { id: 'EP-004', publisherName: '检验模块（lab）', publishedEvents: '检验医嘱事件（lab.order.created）、检验结果事件（lab.result.pushed）', status: '在线（正常运行）', lastPublish: '2026-10-20 15:00:00（最近 1 分钟内）', throughput: '60 条/秒（今日平均发布速率）' },
    { id: 'EP-005', publisherName: '影像模块（radiology）', publishedEvents: '影像医嘱事件（imaging.order.created）、影像报告事件（imaging.report.pushed）', status: '在线（正常运行）', lastPublish: '2026-10-20 15:00:00（最近 1 分钟内）', throughput: '40 条/秒（今日平均发布速率）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/consumers - 事件消费者 5 条 */
async function handleEventsConsumers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EC-001', consumerName: '药房系统（pharmacy-service）', consumedEvents: '处方开具事件（prescription.created）、处方审核事件（prescription.audited）', status: '在线（正常运行）', lastConsume: '2026-10-20 15:00:00（最近 1 分钟内）', latency: '< 1 秒（从事件发布到消费完成的平均延迟）' },
    { id: 'EC-002', consumerName: '收费系统（billing-service）', consumedEvents: '病历提交事件（medical.record.submitted）、出院结算事件（billing.settled）', status: '在线（正常运行）', lastConsume: '2026-10-20 15:00:00（最近 1 分钟内）', latency: '< 1 秒（从事件发布到消费完成的平均延迟）' },
    { id: 'EC-003', consumerName: 'LIS 系统（lab-service）', consumedEvents: '检验医嘱事件（lab.order.created）、检验结果事件（lab.result.pushed）', status: '离线（已停止运行）', lastConsume: '2026-10-20 14:00:00（1 小时前，已超过消费超时阈值）', latency: 'N/A（离线状态，无法计算延迟）' },
    { id: 'EC-004', consumerName: 'PACS 系统（imaging-service）', consumedEvents: '影像医嘱事件（imaging.order.created）、影像报告事件（imaging.report.pushed）', status: '在线（正常运行）', lastConsume: '2026-10-20 15:00:00（最近 1 分钟内）', latency: '< 1 秒（从事件发布到消费完成的平均延迟）' },
    { id: 'EC-005', consumerName: '数据仓库（data-warehouse）', consumedEvents: '所有事件（通配符 *）', status: '在线（正常运行）', lastConsume: '2026-10-20 15:00:00（最近 1 分钟内）', latency: '< 5 秒（从事件发布到消费完成的平均延迟，因需处理所有事件，延迟略高）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/metrics-detail - 事件指标详情 5 条 */
async function handleEventsMetricsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EMD-001', metricName: '事件发布吞吐量', value: '260 条/秒', unit: '条/秒（今日平均发布速率）', trend: '稳定（较昨日持平，波动 < 5%）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'EMD-002', metricName: '事件消费吞吐量', value: '255 条/秒', unit: '条/秒（今日平均消费速率）', trend: '稳定（较昨日持平，波动 < 5%）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'EMD-003', metricName: '事件延迟（平均）', value: '0.8 秒', unit: '秒（从事件发布到消费完成的平均延迟）', trend: '稳定（较昨日持平，波动 < 10%）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'EMD-004', metricName: '事件失败率', value: '0.5%', unit: '%（今日失败事件占总事件的比例）', trend: '下降（较昨日下降 0.2%，因 LIS 系统离线导致部分检验事件失败）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'EMD-005', metricName: '死信队列大小', value: '5 条', unit: '条（当前死信队列中的事件数量）', trend: '稳定（较昨日持平，因 LIS 系统离线导致 5 条检验事件进入死信队列）', time: '2026-10-20 15:00:00（实时统计）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m350Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/events/list', handle: handleEventsList, auth: true },
  { method: 'GET', path: '/api/v1/events/types', handle: handleEventsTypes, auth: true },
  { method: 'GET', path: '/api/v1/events/subscribers', handle: handleEventsSubscribers, auth: true },
  { method: 'GET', path: '/api/v1/events/publish', handle: handleEventsPublish, auth: true },
  { method: 'GET', path: '/api/v1/events/consumers', handle: handleEventsConsumers, auth: true },
  { method: 'GET', path: '/api/v1/events/metrics-detail', handle: handleEventsMetricsDetail, auth: true },
];
