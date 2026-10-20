/**
 * 健澜科技 jlmedaios - M390 P1 业务扩展：BI运营分析深度打磨
 *
 * 图表数据/BI报告/BI分析/数据导出/定时报表（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/bi/charts - 图表数据 5 条 */
async function handleBiCharts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BC-001', chartName: '门诊量趋势图（近 30 天）', dimension: '日期（X 轴）', metric: '门诊量（人次）', data: '10月1日: 1200, 10月2日: 1350, 10月3日: 1280, ...（共 30 个数据点）', time: '2026-10-20 08:00:00（数据更新时间）' },
    { id: 'BC-002', chartName: '住院人数分布图（按科室）', dimension: '科室（X 轴）', metric: '住院人数（人）', data: '内科: 85, 外科: 72, 妇产科: 45, 儿科: 38, 急诊科: 25, ...（共 15 个科室）', time: '2026-10-20 08:00:00（数据更新时间）' },
    { id: 'BC-003', chartName: '手术量月度对比图（近 12 个月）', dimension: '月份（X 轴）', metric: '手术量（台）', data: '2025年11月: 120, 2025年12月: 135, 2026年1月: 110, ...（共 12 个数据点）', time: '2026-10-20 08:00:00（数据更新时间）' },
    { id: 'BC-004', chartName: '医保费用占比饼图（2026 年 9 月）', dimension: '费用类型（饼图分区）', metric: '费用占比（%）', data: '医保统筹支付: 60%, 个人自付: 30%, 大病保险: 10%', time: '2026-10-20 08:00:00（数据更新时间）' },
    { id: 'BC-005', chartName: '患者满意度趋势图（近 12 个月）', dimension: '月份（X 轴）', metric: '满意度评分（分）', data: '2025年11月: 4.2, 2025年12月: 4.3, 2026年1月: 4.2, ...（共 12 个数据点）', time: '2026-10-20 08:00:00（数据更新时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/bi/reports - BI报告 5 条 */
async function handleBiReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BR-001', reportName: '2026 年 9 月医院运营月报', period: '2026 年 9 月（2026-09-01 至 2026-09-30）', metric: '门诊量、住院人数、手术量、医疗收入、医保费用', conclusion: '9 月医院运营整体平稳，门诊量同比增长 5%，住院人数同比增长 3%，医疗收入同比增长 4%', time: '2026-10-05 10:00:00（报告生成时间）' },
    { id: 'BR-002', reportName: '2026 年 Q3 医院运营季报', period: '2026 年 Q3（2026-07-01 至 2026-09-30）', metric: '门诊量、住院人数、手术量、医疗收入、患者满意度', conclusion: 'Q3 医院运营整体良好，门诊量同比增长 6%，患者满意度同比提升 0.1 分', time: '2026-10-10 14:00:00（报告生成时间）' },
    { id: 'BR-003', reportName: '2026 年 9 月科室运营月报（内科）', period: '2026 年 9 月（2026-09-01 至 2026-09-30）', metric: '门诊量、住院人数、手术量、科室收入、药占比', conclusion: '内科 9 月门诊量同比增长 8%，药占比同比下降 2%，运营质量持续改善', time: '2026-10-06 11:00:00（报告生成时间）' },
    { id: 'BR-004', reportName: '2026 年 9 月医保费用分析报告', period: '2026 年 9 月（2026-09-01 至 2026-09-30）', metric: '医保费用总额、医保支付比例、个人自付比例、超支情况', conclusion: '9 月医保费用总额 500 万元，医保支付比例 60%，超支率 0%（无超支）', time: '2026-10-07 15:00:00（报告生成时间）' },
    { id: 'BR-005', reportName: '2026 年 9 月患者满意度调查报告', period: '2026 年 9 月（2026-09-01 至 2026-09-30）', metric: '门诊满意度、住院满意度、医生服务态度、护士服务态度、就诊环境', conclusion: '9 月患者满意度 4.3 分（满分 5 分），同比提升 0.1 分，门诊满意度 4.4 分，住院满意度 4.2 分', time: '2026-10-08 09:00:00（报告生成时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/bi/analysis - BI分析 5 条 */
async function handleBiAnalysis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BA-001', analysisName: '门诊量增长原因分析（2026 年 9 月）', dimension: '科室、疾病类型、医保类型', metric: '门诊量增长率、门诊量占比', conclusion: '9 月门诊量同比增长 5%，主要原因是内科门诊量增长 8%（高血压、糖尿病等慢性病患者增加）', time: '2026-10-06 10:00:00（分析时间）' },
    { id: 'BA-002', analysisName: '住院人数下降原因分析（2026 年 9 月）', dimension: '科室、疾病类型、住院天数', metric: '住院人数下降率、平均住院日', conclusion: '9 月住院人数同比下降 2%，主要原因是外科住院人数下降 5%（日间手术比例提高，平均住院日缩短）', time: '2026-10-07 11:00:00（分析时间）' },
    { id: 'BA-003', analysisName: '药占比下降原因分析（2026 年 9 月）', dimension: '科室、药品类型、医保类型', metric: '药占比下降率、药占比绝对值', conclusion: '9 月药占比同比下降 2%，主要原因是抗菌药物使用比例下降 3%（抗菌药物专项整治效果显著）', time: '2026-10-08 14:00:00（分析时间）' },
    { id: 'BA-004', analysisName: '患者满意度提升原因分析（2026 年 9 月）', dimension: '就诊环节、服务类型、科室', metric: '满意度提升幅度、各环节满意度评分', conclusion: '9 月患者满意度同比提升 0.1 分，主要原因是门诊候诊时间缩短 10 分钟（预约挂号比例提高）', time: '2026-10-09 15:00:00（分析时间）' },
    { id: 'BA-005', analysisName: '医保费用超支风险分析（2026 年 Q4 预测）', dimension: '科室、疾病类型、医保类型', metric: '医保费用预测、超支风险等级', conclusion: 'Q4 医保费用预测 1500 万元，超支风险低（当前医保预算 1600 万元，预算充足）', time: '2026-10-10 09:00:00（分析时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/bi/export - 数据导出 5 条 */
async function handleBiExport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BE-001', exportId: 'EXP-2026-1001', dataType: '门诊量数据（2026 年 9 月）', quantity: '30 天 × 15 个科室 = 450 条数据', time: '2026-10-20 09:00:00（导出时间）', status: '已导出（文件格式：Excel，文件大小：2.5 MB）' },
    { id: 'BE-002', exportId: 'EXP-2026-1002', dataType: '住院人数数据（2026 年 9 月）', quantity: '30 天 × 15 个科室 = 450 条数据', time: '2026-10-20 10:00:00（导出时间）', status: '已导出（文件格式：Excel，文件大小：2.0 MB）' },
    { id: 'BE-003', exportId: 'EXP-2026-1003', dataType: '手术量数据（2026 年 Q3）', quantity: '92 天 × 10 个手术科室 = 920 条数据', time: '2026-10-20 11:00:00（导出时间）', status: '已导出（文件格式：Excel，文件大小：3.5 MB）' },
    { id: 'BE-004', exportId: 'EXP-2026-1004', dataType: '医保费用数据（2026 年 9 月）', quantity: '30 天 × 5 个费用类型 = 150 条数据', time: '2026-10-20 14:00:00（导出时间）', status: '已导出（文件格式：Excel，文件大小：1.5 MB）' },
    { id: 'BE-005', exportId: 'EXP-2026-1005', dataType: '患者满意度数据（2026 年 9 月）', quantity: '30 天 × 10 个就诊环节 = 300 条数据', time: '2026-10-20 15:00:00（导出时间）', status: '已导出（文件格式：Excel，文件大小：1.0 MB）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/bi/scheduled - 定时报表 5 条 */
async function handleBiScheduled(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BS-001', reportName: '医院运营日报', period: '每日早上 08:00 自动生成', recipient: '院长、分管副院长、各科室主任', status: '运行正常（今日报表已于 08:00 发送）', time: '2026-10-20 08:00:00（上次发送时间）' },
    { id: 'BS-002', reportName: '医院运营周报', period: '每周一早上 09:00 自动生成', recipient: '院长、分管副院长、各科室主任', status: '运行正常（上周报表已于周一 09:00 发送）', time: '2026-10-20 09:00:00（上次发送时间）' },
    { id: 'BS-003', reportName: '医院运营月报', period: '每月 5 日早上 10:00 自动生成', recipient: '院长、分管副院长、各科室主任、财务科主任', status: '运行正常（9 月报表已于 10 月 5 日 10:00 发送）', time: '2026-10-05 10:00:00（上次发送时间）' },
    { id: 'BS-004', reportName: '医保费用月报', period: '每月 6 日早上 11:00 自动生成', recipient: '院长、分管副院长、财务科主任、医保科主任', status: '运行正常（9 月报表已于 10 月 6 日 11:00 发送）', time: '2026-10-06 11:00:00（上次发送时间）' },
    { id: 'BS-005', reportName: '患者满意度月报', period: '每月 8 日早上 14:00 自动生成', recipient: '院长、分管副院长、各科室主任、护理部主任', status: '运行正常（9 月报表已于 10 月 8 日 14:00 发送）', time: '2026-10-08 14:00:00（上次发送时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m390Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/bi/charts', handle: handleBiCharts, auth: true },
  { method: 'GET', path: '/api/v1/bi/reports', handle: handleBiReports, auth: true },
  { method: 'GET', path: '/api/v1/bi/analysis', handle: handleBiAnalysis, auth: true },
  { method: 'GET', path: '/api/v1/bi/export', handle: handleBiExport, auth: true },
  { method: 'GET', path: '/api/v1/bi/scheduled', handle: handleBiScheduled, auth: true },
];
