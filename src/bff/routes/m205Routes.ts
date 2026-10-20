/**
 * 健澜科技 jlmedaios - M205 报表中心 + 不良事件 + 合理用药监测
 *
 * 日报/月报/质量报表 + 不良事件/隐患 + 合理用药/抗菌药物 + 传染病上报
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、报表中心 ==================== */

/** GET /api/v1/reports/daily - 日报 */
async function handleReportsDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    date: '2026-10-20',
    outpatient: { today: 1250, yesterday: 1180, change: '+5.9%' },
    inpatient: { today: 856, yesterday: 842, change: '+1.7%' },
    surgeries: { today: 12, yesterday: 10, change: '+20%' },
    revenue: { today: 1256000, yesterday: 1180000, change: '+6.4%' },
    bedUtilization: '85.6%',
  }));
}

/** GET /api/v1/reports/monthly - 月报汇总 */
async function handleReportsMonthly(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    month: '2026-10',
    kpi: [
      { name: '门急诊人次', target: 35000, actual: 32000, completeRate: '91.4%', yoy: '+8.5%', mom: '+3.2%' },
      { name: '出院人数', target: 1200, actual: 1100, completeRate: '91.7%', yoy: '+6.2%', mom: '+2.1%' },
      { name: '手术台次', target: 320, actual: 290, completeRate: '90.6%', yoy: '+10.3%', mom: '+5.5%' },
      { name: '总收入（万元）', target: 3800, actual: 3500, completeRate: '92.1%', yoy: '+7.8%', mom: '+4.2%' },
      { name: '平均住院日', target: 7.0, actual: 7.2, completeRate: '97.2%', yoy: '-3.1%', mom: '-0.5%' },
      { name: '床位周转次数', target: 5.0, actual: 4.8, completeRate: '96.0%', yoy: '+2.3%', mom: '+1.1%' },
    ],
  }));
}

/** GET /api/v1/reports/quality - 医疗质量报表 */
async function handleReportsQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    period: '2026-Q3',
    indicators: [
      { name: '治愈率', value: '65.2%', target: '>60%', status: 'good' },
      { name: '好转率', value: '28.5%', target: '<35%', status: 'good' },
      { name: '死亡率', value: '1.2%', target: '<2%', status: 'good' },
      { name: '院内感染率', value: '1.2%', target: '<3%', status: 'good' },
      { name: '危重抢救成功率', value: '85.6%', target: '>80%', status: 'good' },
      { name: '手术并发症发生率', value: '2.5%', target: '<3%', status: 'good' },
    ],
  }));
}

/* ==================== 二、医疗安全不良事件 ==================== */

/** GET /api/v1/safety/adverse-events - 不良事件上报列表 */
async function handleSafetyAdverseEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const events = [
    { id: 'AE-001', type: '跌倒', level: 'II级不良后果', patient: '张演示', time: '2026-10-19 22:00', reporter: '护士-小王', status: '已处理' },
    { id: 'AE-002', type: '用药错误', level: 'I级警告', patient: '李患者', time: '2026-10-20 09:30', reporter: '药师-小张', status: '已处理' },
    { id: 'AE-003', type: '管路滑脱', level: 'II级不良后果', patient: '王患者', time: '2026-10-19 15:00', reporter: '护士-小李', status: '处理中' },
    { id: 'AE-004', type: '压疮', level: 'III级未造成后果', patient: '赵患者', time: '2026-10-18 10:00', reporter: '护士-小陈', status: '已处理' },
    { id: 'AE-005', type: '坠床', level: 'I级警告', patient: '刘患者', time: '2026-10-20 06:00', reporter: '护士-小王', status: '上报中' },
  ];

  return json(ok({ events, totalCount: events.length }));
}

/** GET /api/v1/safety/near-miss - 隐患事件列表 */
async function handleSafetyNearMiss(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const nearMisses = [
    { id: 'NM-001', description: '药品摆放错误，发药前核对发现', riskLevel: 'high', discoverer: '药师-小张', action: '重新整理药架，增加色标管理' },
    { id: 'NM-002', description: '患者身份核对不严格，险些输错血', riskLevel: 'critical', discoverer: '护士-小李', action: '严格执行三查七对，双人核对' },
    { id: 'NM-003', description: '氧气瓶压力不足，抢救时险些中断', riskLevel: 'medium', discoverer: '护士-小陈', action: '每日检查氧气瓶压力，备用瓶到位' },
  ];

  return json(ok({ nearMisses, totalCount: nearMisses.length }));
}

/* ==================== 三、合理用药监测 ==================== */

/** GET /api/v1/pma/monitor - 合理用药监测 */
async function handlePmaMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const monitors = [
    { id: 'PMA-001', drug: '阿莫西林克拉维酸钾', type: '用法用量不适宜', patient: '张演示', doctor: '李医生', suggestion: '患者肾功能不全，建议减量' },
    { id: 'PMA-002', drug: '华法林', type: '遴选药品不适宜', patient: '李患者', doctor: '王医生', suggestion: '患者出血风险高，建议换用利伐沙班' },
    { id: 'PMA-003', drug: '辛伐他汀+克拉霉素', type: '联合用药不适宜', patient: '王患者', doctor: '张医生', suggestion: '联用增加横纹肌溶解风险，建议停用辛伐他汀' },
    { id: 'PMA-004', drug: '奥美拉唑+雷尼替丁', type: '重复给药', patient: '赵患者', doctor: '刘医生', suggestion: '同类抑酸药重复使用，建议停用雷尼替丁' },
    { id: 'PMA-005', drug: '头孢曲松', type: '用法用量不适宜', patient: '刘患者', doctor: '陈医生', suggestion: '每日一次给药频次正确，但溶媒量建议5%葡萄糖' },
  ];

  return json(ok({ monitors, totalCount: monitors.length }));
}

/** GET /api/v1/pma/antibiotic - 抗菌药物使用强度 */
async function handlePmaAntibiotic(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    period: '2026-Q3',
    indicators: [
      { name: '全院DDD值', value: '45.2', target: '<40', status: 'warning' },
      { name: '抗菌药物使用率', value: '55%', target: '<60%', status: 'good' },
      { name: '门诊抗菌药物使用率', value: '20%', target: '<20%', status: 'good' },
      { name: '住院抗菌药物使用率', value: '65%', target: '<60%', status: 'warning' },
      { name: '越级处方比例', value: '3.5%', target: '<5%', status: 'good' },
    ],
  }));
}

/* ==================== 四、传染病上报 ==================== */

/** GET /api/v1/infectious/notifications - 传染病上报 */
async function handleInfectiousNotifications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const notifications = [
    { id: 'INF-001', disease: '新型冠状病毒感染', patient: '张演示', diagTime: '2026-10-19', reportTime: '2026-10-19 12:00', reporter: '医生-李医生', status: '已上报' },
    { id: 'INF-002', disease: '肺结核（病原学阳性）', patient: '李患者', diagTime: '2026-10-18', reportTime: '2026-10-19 09:00', reporter: '医生-王医生', status: '已上报' },
    { id: 'INF-003', disease: '病毒性肝炎（乙肝）', patient: '王患者', diagTime: '2026-10-20', reportTime: null, reporter: null, status: '审核中' },
  ];

  return json(ok({ notifications, totalCount: notifications.length }));
}

export const m205Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/reports/daily', handle: handleReportsDaily, auth: true },
  { method: 'GET', path: '/api/v1/reports/monthly', handle: handleReportsMonthly, auth: true },
  { method: 'GET', path: '/api/v1/reports/quality', handle: handleReportsQuality, auth: true },
  { method: 'GET', path: '/api/v1/safety/adverse-events', handle: handleSafetyAdverseEvents, auth: true },
  { method: 'GET', path: '/api/v1/safety/near-miss', handle: handleSafetyNearMiss, auth: true },
  { method: 'GET', path: '/api/v1/pma/monitor', handle: handlePmaMonitor, auth: true },
  { method: 'GET', path: '/api/v1/pma/antibiotic', handle: handlePmaAntibiotic, auth: true },
  { method: 'GET', path: '/api/v1/infectious/notifications', handle: handleInfectiousNotifications, auth: true },
];
