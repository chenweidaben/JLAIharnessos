/**
 * 健澜科技 jlmedaios - M511 P0 合规重点（互联互通四甲·事件驱动架构）：事件总线监控看板 3 端点
 *
 * eventbus/events 事件列表、eventbus/consumers 消费者组、eventbus/stats 事件总线统计。
 * 与 M485 /security/privacy、M510b /nursing/nqi-*、M510 /nursing/nqi/*、M509 /cds/*、/outpatient/* 路由区分（走 eventbus/ 新前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/eventbus/events - 事件列表（类型Tag/状态Tag/时间）5 条 */
async function handleEventbusEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBE-001', type: '事件类型Tag：patient.created蓝（新患者建档，ID=P-20261020001）', status: '事件状态Tag：delivered绿（已投送至 EMR、HIS、CDS 三个订阅者）', time: '产生时间：2026-10-20 09:30:15.234' },
    { id: 'EBE-002', type: '事件类型Tag：order.placed橙（新医嘱开立，医嘱号 O-20261020005）', status: '事件状态Tag：pending黄（等待 CDS 合理用药审查消费者处理）', time: '产生时间：2026-10-20 10:05:42.108' },
    { id: 'EBE-003', type: '事件类型Tag：lab.result绿（检验结果回报，项目=血钾）', status: '事件状态Tag：delivered绿（已投送至 LIS、EMR、CDS）', time: '产生时间：2026-10-20 06:15:08.567' },
    { id: 'EBE-004', type: '事件类型Tag：critical.alert红（危急值告警，血钾 2.8 mmol/L）', status: '事件状态Tag：failed红（短信通知消费者超时重试 3 次失败）', time: '产生时间：2026-10-20 06:15:30.001' },
    { id: 'EBE-005', type: '事件类型Tag：consent.updated紫（患者知情同意书更新，同意书 ID=C-20261019003）', status: '事件状态Tag：dead-letter灰（死信队列，下游审计消费者未上线）', time: '产生时间：2026-10-19 16:20:18.923' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/eventbus/consumers - 消费者组（消费者名/订阅主题/延迟Tag/积压数）5 条 */
async function handleEventbusConsumers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBC-001', consumer: '消费者名：EMR 同步消费者（emr-sync-consumer，组 ID=emr-group）', topic: '订阅主题：patient.created、patient.updated、encounter.*', latency: '消费延迟Tag：<1s绿（平均 0.3s）', backlog: '积压消息数：0 条（实时消费）' },
    { id: 'EBC-002', consumer: '消费者名：CDS 合理用药审查消费者（cds-med-consumer，组 ID=cds-group）', topic: '订阅主题：order.placed、order.updated', latency: '消费延迟Tag：1-5s橙（平均 2.8s，需调优）', backlog: '积压消息数：12 条（峰值时段积压）' },
    { id: 'EBC-003', consumer: '消费者名：LIS 检验同步消费者（lis-sync-consumer，组 ID=lis-group）', topic: '订阅主题：lab.result、lab.critical', latency: '消费延迟Tag：<1s绿（平均 0.5s）', backlog: '积压消息数：0 条' },
    { id: 'EBC-004', consumer: '消费者名：危急值短信通知消费者（sms-critical-consumer，组 ID=sms-group）', topic: '订阅主题：critical.alert', latency: '消费延迟Tag：>5s红（平均 8.2s，短信网关响应慢）', backlog: '积压消息数：3 条（含 1 条 failed）' },
    { id: 'EBC-005', consumer: '消费者名：审计日志消费者（audit-consumer，组 ID=audit-group）', topic: '订阅主题：consent.updated、user.action', latency: '消费延迟Tag：<1s绿（平均 0.2s）', backlog: '积压消息数：5 条（死信队列，下游未上线）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/eventbus/stats - 事件总线统计（今日总量/成功率/死信率/平均延迟）5 条 */
async function handleEventbusStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EBS-001', todayTotal: '今日事件总量：28,600 条（patient.* 5,200 / order.* 12,800 / lab.* 8,600 / critical.* 200 / consent.* 1,800）', successRate: '投递成功率：99.8%（28,543 / 28,600 条成功投递）', deadLetterRate: '死信率：0.05%（14 条死信，主要为审计消费者未上线）', avgLatency: '平均延迟：0.8s（P99=3.2s，P999=8.5s）' },
    { id: 'EBS-002', todayTotal: '昨日（2026-10-19）事件总量：32,400 条', successRate: '投递成功率：99.7%', deadLetterRate: '死信率：0.08%', avgLatency: '平均延迟：1.2s（早高峰积压略高）' },
    { id: 'EBS-003', todayTotal: '近 7 日平均事件总量：30,200 条/日', successRate: '近 7 日平均成功率：99.75%', deadLetterRate: '近 7 日平均死信率：0.06%', avgLatency: '近 7 日平均延迟：1.0s' },
    { id: 'EBS-004', todayTotal: '本月（2026-10）累计事件总量：586,000 条（截至 10-20）', successRate: '本月累计成功率：99.7%', deadLetterRate: '本月累计死信率：0.07%', avgLatency: '本月累计平均延迟：1.1s' },
    { id: 'EBS-005', todayTotal: '分类型事件总量：order.* 占比最高 45%（医嘱开立/更新最频繁）', successRate: '分类型成功率：critical.* 98.5%（短信网关偶发超时拉低）', deadLetterRate: '分类型死信率：consent.* 0.3%（审计消费者未上线，需紧急对接）', avgLatency: '分类型延迟：cds-med-consumer 平均 2.8s（需扩容优化）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m511Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/eventbus/events', handle: handleEventbusEvents, auth: true },
  { method: 'GET', path: '/api/v1/eventbus/consumers', handle: handleEventbusConsumers, auth: true },
  { method: 'GET', path: '/api/v1/eventbus/stats', handle: handleEventbusStats, auth: true },
];
