/**
 * 健澜科技 jlmedaios - M301 运营管理域
 *
 * 运营看板/KPI/科室对比/效率分析/成本分析/收入分析
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/operation/dashboard - 运营看板 1 条 */
async function handleOperationDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    outpatientVolume: '日均 3,200 人次',
    inpatientVolume: '在院 850 人（床位使用率 92%）',
    surgeryVolume: '日均 45 台',
    revenue: '月收入 1.2 亿元（同比 +8.5%）',
    satisfaction: '患者满意度 96.2%',
  }));
}

/** GET /api/v1/operation/kpi - KPI 指标 5 条 */
async function handleOperationKpi(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { name: '门诊量（月）', target: '100,000 人次', actual: '96,500 人次', completion: '96.5%', trend: '↑ 同比 +5.2%' },
    { name: '平均住院日', target: '<8.0 天', actual: '7.6 天', completion: '达标', trend: '↓ 同比缩短 0.5 天' },
    { name: '床位使用率', target: '85%-93%', actual: '92%', completion: '达标', trend: '→ 持平' },
    { name: '手术台次（月）', target: '1,400 台', actual: '1,350 台', completion: '96.4%', trend: '↑ 同比 +3.8%' },
    { name: '患者满意度', target: '≥95%', actual: '96.2%', completion: '达标', trend: '↑ 同比 +1.5%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/comparison - 科室对比 5 条 */
async function handleOperationComparison(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { dept: '心血管内科', metric: '月收入 1,850 万元', rank: '第 1 名', yoy: '+12.5%', mom: '+3.2%' },
    { dept: '骨科', metric: '月收入 1,620 万元', rank: '第 2 名', yoy: '+8.8%', mom: '+2.1%' },
    { dept: '普外科', metric: '月收入 1,450 万元', rank: '第 3 名', yoy: '+6.2%', mom: '-1.5%' },
    { dept: '呼吸内科', metric: '月收入 1,280 万元', rank: '第 4 名', yoy: '+9.5%', mom: '+4.8%' },
    { dept: '神经内科', metric: '月收入 1,150 万元', rank: '第 5 名', yoy: '+4.1%', mom: '+1.2%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/efficiency - 效率分析 5 条 */
async function handleOperationEfficiency(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { dept: '心血管内科', avgStay: '6.2 天', bedTurnover: '15.2 次/年', avgSurgeryTime: '—', efficiencyScore: 'A+' },
    { dept: '骨科', avgStay: '8.5 天', bedTurnover: '12.8 次/年', avgSurgeryTime: '2.5 小时', efficiencyScore: 'A' },
    { dept: '普外科', avgStay: '7.8 天', bedTurnover: '13.5 次/年', avgSurgeryTime: '1.8 小时', efficiencyScore: 'A' },
    { dept: '呼吸内科', avgStay: '9.2 天', bedTurnover: '11.5 次/年', avgSurgeryTime: '—', efficiencyScore: 'B+' },
    { dept: '神经内科', avgStay: '10.5 天', bedTurnover: '9.8 次/年', avgSurgeryTime: '—', efficiencyScore: 'B' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/cost - 成本分析 5 条 */
async function handleOperationCost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { dept: '心血管内科', laborCost: '680 万元', materialCost: '320 万元', equipmentCost: '150 万元', totalCost: '1,150 万元' },
    { dept: '骨科', laborCost: '520 万元', materialCost: '480 万元', equipmentCost: '200 万元', totalCost: '1,200 万元' },
    { dept: '普外科', laborCost: '480 万元', materialCost: '350 万元', equipmentCost: '120 万元', totalCost: '950 万元' },
    { dept: '呼吸内科', laborCost: '420 万元', materialCost: '280 万元', equipmentCost: '100 万元', totalCost: '800 万元' },
    { dept: '神经内科', laborCost: '380 万元', materialCost: '200 万元', equipmentCost: '80 万元', totalCost: '660 万元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operation/revenue - 收入分析 5 条 */
async function handleOperationRevenue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { dept: '心血管内科', outpatient: '520 万元', inpatient: '980 万元', medication: '350 万元', total: '1,850 万元' },
    { dept: '骨科', outpatient: '380 万元', inpatient: '920 万元', medication: '320 万元', total: '1,620 万元' },
    { dept: '普外科', outpatient: '420 万元', inpatient: '780 万元', medication: '250 万元', total: '1,450 万元' },
    { dept: '呼吸内科', outpatient: '350 万元', inpatient: '680 万元', medication: '250 万元', total: '1,280 万元' },
    { dept: '神经内科', outpatient: '320 万元', inpatient: '580 万元', medication: '250 万元', total: '1,150 万元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m301Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/operation/dashboard', handle: handleOperationDashboard, auth: true },
  { method: 'GET', path: '/api/v1/operation/kpi', handle: handleOperationKpi, auth: true },
  { method: 'GET', path: '/api/v1/operation/comparison', handle: handleOperationComparison, auth: true },
  { method: 'GET', path: '/api/v1/operation/efficiency', handle: handleOperationEfficiency, auth: true },
  { method: 'GET', path: '/api/v1/operation/cost', handle: handleOperationCost, auth: true },
  { method: 'GET', path: '/api/v1/operation/revenue', handle: handleOperationRevenue, auth: true },
];
