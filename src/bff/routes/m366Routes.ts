/**
 * 健澜科技 jlmedaios - M366 P1 业务扩展：财务深度打磨
 *
 * 财务看板/成本管理/财务报告/财务分析（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/finance/dashboard - 财务看板 5 条 */
async function handleFinanceDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FD-001', metricName: '本月总收入', value: '1,230 万元（本月总收入）', unit: '万元/月', trend: '上升（较上月上升 5%，因门诊量增加）', time: '2026-10-20（实时统计）' },
    { id: 'FD-002', metricName: '本月总支出', value: '980 万元（本月总支出）', unit: '万元/月', trend: '稳定（较上月持平，波动 < 3%）', time: '2026-10-20（实时统计）' },
    { id: 'FD-003', metricName: '本月净利润', value: '250 万元（本月净利润）', unit: '万元/月', trend: '上升（较上月上升 10%，因收入增加）', time: '2026-10-20（实时统计）' },
    { id: 'FD-004', metricName: '年度累计收入', value: '10,500 万元（年初至今累计收入）', unit: '万元/年', trend: '稳定（较去年同期持平，波动 < 2%）', time: '2026-10-20（年度统计）' },
    { id: 'FD-005', metricName: '年度累计支出', value: '8,200 万元（年初至今累计支出）', unit: '万元/年', trend: '稳定（较去年同期上升 3%，因人力成本增加）', time: '2026-10-20（年度统计）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/costs - 成本管理 5 条 */
async function handleFinanceCosts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FC-001', costItem: '人力成本（工资+福利）', department: '全院（所有科室）', amount: '490 万元/月（本月人力成本）', time: '2026-10（本月）', percentage: '50%（占总成本比例）' },
    { id: 'FC-002', costItem: '药品成本', department: '全院（所有科室）', amount: '294 万元/月（本月药品成本）', time: '2026-10（本月）', percentage: '30%（占总成本比例）' },
    { id: 'FC-003', costItem: '设备折旧成本', department: '全院（所有科室）', amount: '98 万元/月（本月设备折旧）', time: '2026-10（本月）', percentage: '10%（占总成本比例）' },
    { id: 'FC-004', costItem: '耗材成本', department: '全院（所有科室）', amount: '49 万元/月（本月耗材成本）', time: '2026-10（本月）', percentage: '5%（占总成本比例）' },
    { id: 'FC-005', costItem: '其他成本（水电、物业等）', department: '全院（所有科室）', amount: '49 万元/月（本月其他成本）', time: '2026-10（本月）', percentage: '5%（占总成本比例）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/reports - 财务报告 5 条 */
async function handleFinanceReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FR-001', reportName: '2026 年 10 月财务月度报告', period: '2026-10（本月）', metric: '总收入（1,230 万元）、总支出（980 万元）、净利润（250 万元）、人力成本占比（50%）、药品成本占比（30%）', conclusion: '本月财务状况良好，净利润率达 20.3%（净利润/总收入），优于年度目标（15%）', time: '2026-10-20（报告生成时间）' },
    { id: 'FR-002', reportName: '2026 年 Q3 财务季度报告', period: '2026-07 至 2026-09（Q3）', metric: '总收入（3,600 万元）、总支出（2,900 万元）、净利润（700 万元）、人力成本占比（49%）、药品成本占比（31%）', conclusion: 'Q3 财务状况良好，净利润率达 19.4%（净利润/总收入），优于年度目标（15%）', time: '2026-10-15（报告生成时间）' },
    { id: 'FR-003', reportName: '2026 年财务年度分析报告', period: '2026-01 至 2026-10（年初至今）', metric: '总收入（10,500 万元）、总支出（8,200 万元）、净利润（2,300 万元）、人力成本占比（50%）、药品成本占比（30%）', conclusion: '年度财务状况良好，净利润率达 21.9%（净利润/总收入），优于年度目标（15%）', time: '2026-10-20（报告生成时间）' },
    { id: 'FR-004', reportName: '心内科财务专项报告', period: '2026-10（本月）', metric: '心内科收入（200 万元）、心内科支出（150 万元）、心内科净利润（50 万元）', conclusion: '心内科财务状况良好，净利润率达 25%（优于全院平均水平 20.3%）', time: '2026-10-20（报告生成时间）' },
    { id: 'FR-005', reportName: '急诊科财务专项报告', period: '2026-10（本月）', metric: '急诊科收入（80 万元）、急诊科支出（100 万元）、急诊科净亏损（-20 万元）', conclusion: '急诊科财务状况不佳，净亏损率达 -25%（因急诊公益性强、收费低）', time: '2026-10-20（报告生成时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/analysis - 财务分析 5 条 */
async function handleFinanceAnalysis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FA-001', analysisName: '收入结构分析', dimension: '收入结构维度（医院收入构成分析）', metric: '门诊收入占比（40%）、住院收入占比（55%）、其他收入占比（5%）', conclusion: '收入结构合理，住院收入占比最高（55%），符合综合医院特征', time: '2026-10-20（分析时间）' },
    { id: 'FA-002', analysisName: '成本结构分析', dimension: '成本结构维度（医院成本构成分析）', metric: '人力成本占比（50%）、药品成本占比（30%）、设备折旧占比（10%）、耗材成本占比（5%）、其他成本占比（5%）', conclusion: '成本结构合理，人力成本占比最高（50%），符合医院人力密集型特征', time: '2026-10-20（分析时间）' },
    { id: 'FA-003', analysisName: '科室盈利能力对比分析', dimension: '科室维度（各科室盈利能力对比）', metric: '心内科净利润率（25%）、骨科净利润率（20%）、普外科净利润率（15%）、急诊科净亏损率（-25%）', conclusion: '心内科盈利能力最强，急诊科亏损最大，需加强急诊科成本控制', time: '2026-10-20（分析时间）' },
    { id: 'FA-004', analysisName: '趋势分析', dimension: '时间维度（近 12 个月收入/支出/净利润变化趋势）', metric: '总收入（从 1,100 万元上升到 1,230 万元，增长 12%）、总支出（从 950 万元上升到 980 万元，增长 3%）、净利润（从 150 万元上升到 250 万元，增长 67%）', conclusion: '财务状况持续改善，净利润增长速度（67%）远快于收入增长速度（12%）', time: '2026-10-20（分析时间）' },
    { id: 'FA-005', analysisName: '预算执行分析', dimension: '预算维度（年度预算执行情况分析）', metric: '年度预算收入（12,000 万元）、实际累计收入（10,500 万元）、预算执行率（87.5%）', conclusion: '预算执行率良好（87.5%），预计年底可完成年度预算目标', time: '2026-10-20（分析时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m366Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/finance/dashboard', handle: handleFinanceDashboard, auth: true },
  { method: 'GET', path: '/api/v1/finance/costs', handle: handleFinanceCosts, auth: true },
  { method: 'GET', path: '/api/v1/finance/reports', handle: handleFinanceReports, auth: true },
  { method: 'GET', path: '/api/v1/finance/analysis', handle: handleFinanceAnalysis, auth: true },
];
