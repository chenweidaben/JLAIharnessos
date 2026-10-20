/**
 * 健澜科技 jlmedaios - M321 事件总线深度域
 *
 * 事件总线概览/详情/日志/订阅者/发布者/死信队列
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/events/bus-overview - 事件总线概览 5 条 */
async function handleEventsBusOverview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBO-001', busName: 'clinical-workflow-bus（临床工作流总线）', eventCount: '日均 12,000 事件', subscribers: '18 个订阅者', status: '运行正常（集群 3 节点）', throughput: '峰值 200 事件/秒' },
    { id: 'EBO-002', busName: 'patient-360-bus（患者 360 总线）', eventCount: '日均 8,500 事件', subscribers: '12 个订阅者', status: '运行正常', throughput: '峰值 150 事件/秒' },
    { id: 'EBO-003', busName: 'fhir-hub-bus（FHIR 集成总线）', eventCount: '日均 15,000 事件', subscribers: '8 个订阅者', status: '运行正常', throughput: '峰值 300 事件/秒' },
    { id: 'EBO-004', busName: 'notification-bus（消息通知总线）', eventCount: '日均 6,000 事件', subscribers: '6 个订阅者', status: '运行正常', throughput: '峰值 100 事件/秒' },
    { id: 'EBO-005', busName: 'audit-log-bus（审计日志总线）', eventCount: '日均 20,000 事件', subscribers: '4 个订阅者', status: '运行正常', throughput: '峰值 500 事件/秒' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/bus-detail - 事件总线详情 5 条 */
async function handleEventsBusDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBD-001', busName: 'clinical-workflow-bus', type: 'RabbitMQ 集群（AMQP 0-9-1）', config: 'vhost=/clinical, exchange=workflow.topic, queue 持久化, 镜像队列（HA）', nodes: 'node1:5672 / node2:5672 / node3:5672', status: '运行正常（3 节点在线）' },
    { id: 'EBD-002', busName: 'patient-360-bus', type: 'Kafka 集群（KRaft 模式）', config: 'topic=patient.events, partition=12, replication=3, retention=7 天', nodes: 'kafka1:9092 / kafka2:9092 / kafka3:9092', status: '运行正常' },
    { id: 'EBD-003', busName: 'fhir-hub-bus', type: 'RabbitMQ 集群（AMQP 0-9-1）', config: 'vhost=/fhir, exchange=fhir.fanout, queue 持久化', nodes: 'node1:5672 / node2:5672', status: '运行正常' },
    { id: 'EBD-004', busName: 'notification-bus', type: 'Redis Streams', config: 'stream=notify:events, consumer group=sms-group+email-group, maxlen=100000', nodes: 'redis1:6379 / redis2:6379（哨兵）', status: '运行正常' },
    { id: 'EBD-005', busName: 'audit-log-bus', type: 'Kafka 集群（KRaft 模式）', config: 'topic=audit.logs, partition=24, replication=3, retention=30 天', nodes: 'kafka1:9092 / kafka2:9092 / kafka3:9092', status: '运行正常' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/bus-logs - 事件日志 5 条 */
async function handleEventsBusLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBL-001', eventId: 'EVT-20261020-001234', type: 'patient.admitted（患者入院）', time: '2026-10-20 08:00:15', status: '已处理（5 个订阅者全部成功）', cost: '120ms（平均 24ms/订阅者）' },
    { id: 'EBL-002', eventId: 'EVT-20261020-001235', type: 'order.created（医嘱开立）', time: '2026-10-20 08:01:30', status: '已处理（3 个订阅者成功，1 个重试 1 次后成功）', cost: '250ms' },
    { id: 'EBL-003', eventId: 'EVT-20261020-001236', type: 'lab.result.available（检验结果发布）', time: '2026-10-20 09:15:45', status: '已处理（4 个订阅者全部成功）', cost: '80ms' },
    { id: 'EBL-004', eventId: 'EVT-20261020-001237', type: 'discharge.requested（出院申请）', time: '2026-10-20 10:30:00', status: '处理中（2 个订阅者成功，2 个处理中）', cost: '待统计' },
    { id: 'EBL-005', eventId: 'EVT-20261020-001238', type: 'medication.administered（用药执行）', time: '2026-10-20 11:00:20', status: '已处理（2 个订阅者全部成功）', cost: '60ms' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/bus-subscribers - 事件订阅者 5 条 */
async function handleEventsBusSubscribers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBS-001', subscriberName: 'cds-service（临床决策服务）', subscribedEvents: 'patient.admitted / order.created / lab.result.available', status: '在线（消费者组：cds-group）', lastHeartbeat: '2026-10-20 11:00:30（1 秒前）', location: 'pod：cds-7d9f8b6c5-x2k4m（可用区：cn-hangzhou-i）' },
    { id: 'EBS-002', subscriberName: 'emr-service（电子病历服务）', subscribedEvents: 'patient.admitted / order.created / discharge.requested', status: '在线（消费者组：emr-group）', lastHeartbeat: '2026-10-20 11:00:28（3 秒前）', location: 'pod：emr-6f8b7c9d3-p3n5q（可用区：cn-hangzhou-i）' },
    { id: 'EBS-003', subscriberName: 'notification-service（消息通知服务）', subscribedEvents: 'lab.result.available / medication.administered / discharge.requested', status: '在线（消费者组：notify-group）', lastHeartbeat: '2026-10-20 11:00:25（6 秒前）', location: 'pod：notify-5c7d8b9a2-r4k6l（可用区：cn-hangzhou-h）' },
    { id: 'EBS-004', subscriberName: 'audit-service（审计日志服务）', subscribedEvents: '*（全部事件）', status: '在线（消费者组：audit-group）', lastHeartbeat: '2026-10-20 11:00:32（<1 秒前）', location: 'pod：audit-8d9c7b6e1-s5m7n（可用区：cn-hangzhou-g）' },
    { id: 'EBS-005', subscriberName: 'patient-360-service（患者 360 服务）', subscribedEvents: 'patient.admitted / order.created / lab.result.available / discharge.requested', status: '在线（消费者组：p360-group）', lastHeartbeat: '2026-10-20 11:00:20（11 秒前）', location: 'pod：p360-7e8f9a1b3-t6n8p（可用区：cn-hangzhou-i）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/bus-publishers - 事件发布者 5 条 */
async function handleEventsBusPublishers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBP-001', publisherName: 'registration-service（挂号服务）', publishedEvents: 'patient.admitted / patient.discharged', status: '在线', lastPublish: '2026-10-20 10:55:00（5 分钟前）', throughput: '日均 2,000 事件' },
    { id: 'EBP-002', publisherName: 'order-service（医嘱服务）', publishedEvents: 'order.created / order.updated / order.cancelled', status: '在线', lastPublish: '2026-10-20 11:00:10（<1 分钟前）', throughput: '日均 5,000 事件' },
    { id: 'EBP-003', publisherName: 'lab-service（检验服务）', publishedEvents: 'lab.result.available / lab.critical.value', status: '在线', lastPublish: '2026-10-20 09:15:45（1 小时 45 分钟前）', throughput: '日均 3,000 事件' },
    { id: 'EBP-004', publisherName: 'nursing-service（护理服务）', publishedEvents: 'medication.administered / vital.sign.recorded', status: '在线', lastPublish: '2026-10-20 11:00:20（<1 分钟前）', throughput: '日均 4,000 事件' },
    { id: 'EBP-005', publisherName: 'emr-service（电子病历服务）', publishedEvents: 'discharge.requested / record.signed', status: '在线', lastPublish: '2026-10-20 10:30:00（30 分钟前）', throughput: '日均 1,500 事件' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/bus-deadletter - 死信队列 5 条 */
async function handleEventsBusDeadletter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBD-001', eventId: 'DLQ-20261019-000123', type: 'order.created（医嘱开立）', failReason: 'cds-service 处理超时（>30 秒），3 次重试后仍失败', retryCount: '3 次', time: '2026-10-19 14:30:00' },
    { id: 'EBD-002', eventId: 'DLQ-20261019-000124', type: 'lab.result.available（检验结果发布）', failReason: 'notification-service 连接拒绝（短信网关宕机）', retryCount: '3 次', time: '2026-10-19 16:45:00' },
    { id: 'EBD-003', eventId: 'DLQ-20261020-000125', type: 'patient.admitted（患者入院）', failReason: 'patient-360-service 数据库死锁，事件消费失败', retryCount: '2 次', time: '2026-10-20 08:05:00' },
    { id: 'EBD-004', eventId: 'DLQ-20261020-000126', type: 'medication.administered（用药执行）', failReason: 'audit-service 磁盘满，事件写入失败', retryCount: '3 次', time: '2026-10-20 09:30:00' },
    { id: 'EBD-005', eventId: 'DLQ-20261020-000127', type: 'discharge.requested（出院申请）', failReason: 'emr-service 版本冲突（病历正在编辑）', retryCount: '1 次', time: '2026-10-20 10:35:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m321Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/events/bus-overview', handle: handleEventsBusOverview, auth: true },
  { method: 'GET', path: '/api/v1/events/bus-detail', handle: handleEventsBusDetail, auth: true },
  { method: 'GET', path: '/api/v1/events/bus-logs', handle: handleEventsBusLogs, auth: true },
  { method: 'GET', path: '/api/v1/events/bus-subscribers', handle: handleEventsBusSubscribers, auth: true },
  { method: 'GET', path: '/api/v1/events/bus-publishers', handle: handleEventsBusPublishers, auth: true },
  { method: 'GET', path: '/api/v1/events/bus-deadletter', handle: handleEventsBusDeadletter, auth: true },
];
