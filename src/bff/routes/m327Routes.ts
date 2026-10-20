/**
 * 健澜科技 jlmedaios - M327 大数据 BI + 运营管理域
 *
 * 实时大屏/就诊漏斗/患者留存 + 对标分析/运营预警
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/bi/realtime - 实时大屏 5 条 */
async function handleBiRealtime(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BR-001', metricName: '今日门诊量', realtimeValue: '1,256 人', unit: '人次', trend: '↑ 较昨日同期 +8.5%', time: '2026-10-20 11:30:00' },
    { id: 'BR-002', metricName: '今日住院在院人数', realtimeValue: '486 人', unit: '人', trend: '→ 与昨日同期持平', time: '2026-10-20 11:30:00' },
    { id: 'BR-003', metricName: '今日手术台数', realtimeValue: '32 台', unit: '台', trend: '↑ 较昨日同期 +14.3%', time: '2026-10-20 11:30:00' },
    { id: 'BR-004', metricName: '今日急诊抢救人数', realtimeValue: '8 人', unit: '人', trend: '↓ 较昨日同期 -20%', time: '2026-10-20 11:30:00' },
    { id: 'BR-005', metricName: '当前平均候诊时间', realtimeValue: '18 分钟', unit: '分钟', trend: '↓ 较昨日同期 -10%', time: '2026-10-20 11:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/bi/funnel - 就诊漏斗 5 条 */
async function handleBiFunnel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BF-001', stage: '线上预约', count: '2,500 人', conversionRate: '100%', churnRate: '0%', mom: '↑ 环比上月 +5%' },
    { id: 'BF-002', stage: '到院签到', count: '2,200 人', conversionRate: '88%', churnRate: '12%（预约未到）', mom: '↑ 环比上月 +3%' },
    { id: 'BF-003', stage: '候诊就诊', count: '2,050 人', conversionRate: '93.2%', churnRate: '6.8%（候诊中途离开）', mom: '→ 与上月持平' },
    { id: 'BF-004', stage: '检查检验', count: '1,800 人', conversionRate: '87.8%', churnRate: '12.2%（部分患者无需检查）', mom: '↑ 环比上月 +2%' },
    { id: 'BF-005', stage: '取药离院', count: '1,950 人', conversionRate: '95.1%', churnRate: '4.9%（部分患者需住院进一步治疗）', mom: '↓ 环比上月 -1%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/bi/retention - 患者留存 5 条 */
async function handleBiRetention(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BR-001', cohort: '2026 年 1 月就诊患者（共 5,000 人）', month1: '78%', month3: '62%', month6: '48%', month12: '35%' },
    { id: 'BR-002', cohort: '2026 年 2 月就诊患者（共 5,200 人）', month1: '80%', month3: '64%', month6: '50%', month12: '—' },
    { id: 'BR-003', cohort: '2026 年 3 月就诊患者（共 5,100 人）', month1: '79%', month3: '63%', month6: '49%', month12: '—' },
    { id: 'BR-004', cohort: '2026 年 4 月就诊患者（共 5,300 人）', month1: '81%', month3: '65%', month6: '—', month12: '—' },
    { id: 'BR-005', cohort: '2026 年 5 月就诊患者（共 5,400 人）', month1: '82%', month3: '—', month6: '—', month12: '—' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/benchmark - 对标分析 5 条 */
async function handleOperationBenchmark(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OB-001', metric: '门诊量（日均）', ourValue: '1,250 人次', peerAvg: '1,100 人次', rank: '前 20%（同级 50 家医院）', diff: '↑ 高于同级均值 13.6%' },
    { id: 'OB-002', metric: '平均住院日', ourValue: '8.5 天', peerAvg: '9.2 天', rank: '前 15%（同级 50 家医院）', diff: '↓ 优于同级均值 7.6%' },
    { id: 'OB-003', metric: '床位使用率', ourValue: '92%', peerAvg: '85%', rank: '前 25%（同级 50 家医院）', diff: '↑ 高于同级均值 8.2%' },
    { id: 'OB-004', metric: '患者满意度', ourValue: '92 分', peerAvg: '88 分', rank: '前 20%（同级 50 家医院）', diff: '↑ 高于同级均值 4.5%' },
    { id: 'OB-005', metric: 'CMI 值（病例组合指数）', ourValue: '1.35', peerAvg: '1.20', rank: '前 10%（同级 50 家医院）', diff: '↑ 高于同级均值 12.5%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/alerts - 运营预警 5 条 */
async function handleOperationAlerts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OA-001', alertName: '门诊量异常下降', metric: '今日门诊量', threshold: '较昨日同期下降 >10%', currentValue: '↓ 较昨日同期 -12%', level: '黄色（需关注）' },
    { id: 'OA-002', alertName: '床位使用率过高', metric: '床位使用率', threshold: '>95%（持续 2 小时以上）', currentValue: '96%（已持续 3 小时）', level: '红色（紧急，需协调加床）' },
    { id: 'OA-003', alertName: '平均候诊时间过长', metric: '平均候诊时间', threshold: '>25 分钟', currentValue: '28 分钟（心内科门诊）', level: '黄色（需关注）' },
    { id: 'OA-004', alertName: '药品库存预警', metric: '抗生素库存（阿莫西林）', threshold: '<7 天用量', currentValue: '5 天用量（需紧急补货）', level: '红色（紧急）' },
    { id: 'OA-005', alertName: '设备故障预警', metric: 'CT 设备使用时长', threshold: '连续使用 >4 小时（需检修）', currentValue: '已连续使用 5 小时', level: '黄色（需关注）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m327Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/bi/realtime', handle: handleBiRealtime, auth: true },
  { method: 'GET', path: '/api/v1/bi/funnel', handle: handleBiFunnel, auth: true },
  { method: 'GET', path: '/api/v1/bi/retention', handle: handleBiRetention, auth: true },
  { method: 'GET', path: '/api/v1/operation/benchmark', handle: handleOperationBenchmark, auth: true },
  { method: 'GET', path: '/api/v1/operation/alerts', handle: handleOperationAlerts, auth: true },
];
