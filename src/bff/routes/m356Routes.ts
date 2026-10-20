/**
 * 健澜科技 jlmedaios - M356 P0 合规改造：风险管控深度打磨
 *
 * 风险指标/评分/趋势/基准/预警/报告（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/risk/indicators - 风险指标 5 条 */
async function handleRiskIndicators(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RI-001', indicatorName: '医疗纠纷发生率', targetValue: '< 1 起/百出院患者', actualValue: '0.8 起/百出院患者（本月实际发生率）', complianceRate: '达标（优于目标值 20%）', trend: '下降（较上月下降 0.2 起，因加强了医患沟通）' },
    { id: 'RI-002', indicatorName: '医疗差错发生率', targetValue: '< 0.5%（住院患者差错率）', actualValue: '0.3%（本月实际发生率）', complianceRate: '达标（优于目标值 40%）', trend: '稳定（较上月持平，波动 < 10%）' },
    { id: 'RI-003', indicatorName: '药品不良反应发生率', targetValue: '< 5%（用药患者不良反应率）', actualValue: '6%（本月实际发生率）', complianceRate: '未达标（高于目标值 20%）', trend: '上升（较上月上升 1%，因新药品增多）' },
    { id: 'RI-004', indicatorName: '医院感染风险事件数', targetValue: '< 10 起/月', actualValue: '8 起（本月实际发生数）', complianceRate: '达标（优于目标值 20%）', trend: '下降（较上月下降 2 起，因加强了感染防控）' },
    { id: 'RI-005', indicatorName: '患者投诉率', targetValue: '< 2 起/千门诊量', actualValue: '1.5 起/千门诊量（本月实际投诉率）', complianceRate: '达标（优于目标值 25%）', trend: '下降（较上月下降 0.5 起，因改善了医疗服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/scores - 风险评分 5 条 */
async function handleRiskScores(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RS-001', department: '心内科', indicator: '医疗纠纷发生率（90 分）、医疗差错发生率（92 分）、药品不良反应发生率（85 分）、医院感染风险事件数（88 分）、患者投诉率（90 分）', score: '89 分（总分 100 分）', fullScore: '100 分', grade: 'B 级（良好，风险较低，排名全院前 30%）' },
    { id: 'RS-002', department: '骨科', indicator: '医疗纠纷发生率（85 分）、医疗差错发生率（88 分）、药品不良反应发生率（82 分）、医院感染风险事件数（85 分）、患者投诉率（86 分）', score: '85 分（总分 100 分）', fullScore: '100 分', grade: 'B 级（良好，风险较低，排名全院前 50%）' },
    { id: 'RS-003', department: '普外科', indicator: '医疗纠纷发生率（82 分）、医疗差错发生率（85 分）、药品不良反应发生率（80 分）、医院感染风险事件数（82 分）、患者投诉率（84 分）', score: '83 分（总分 100 分）', fullScore: '100 分', grade: 'C 级（一般，风险中等，排名全院前 60%）' },
    { id: 'RS-004', department: '急诊科', indicator: '医疗纠纷发生率（75 分）、医疗差错发生率（80 分）、药品不良反应发生率（78 分）、医院感染风险事件数（78 分）、患者投诉率（78 分）', score: '78 分（总分 100 分）', fullScore: '100 分', grade: 'C 级（一般，风险中等，排名全院后 30%）' },
    { id: 'RS-005', department: '妇产科', indicator: '医疗纠纷发生率（88 分）、医疗差错发生率（90 分）、药品不良反应发生率（86 分）、医院感染风险事件数（90 分）、患者投诉率（92 分）', score: '89 分（总分 100 分）', fullScore: '100 分', grade: 'B 级（良好，风险较低，排名全院前 20%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/trends - 风险趋势 5 条 */
async function handleRiskTrends(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RT-001', indicatorName: '医疗纠纷发生率', month: '2026-10（本月）', value: '0.8 起/百出院患者（本月实际发生率）', target: '< 1 起/百出院患者（目标值）', change: '下降（较上月 1.0 起 下降 0.2 起，因加强了医患沟通）' },
    { id: 'RT-002', indicatorName: '医疗差错发生率', month: '2026-10（本月）', value: '0.3%（本月实际发生率）', target: '< 0.5%（目标值）', change: '稳定（较上月 0.3% 持平，波动 < 10%）' },
    { id: 'RT-003', indicatorName: '药品不良反应发生率', month: '2026-10（本月）', value: '6%（本月实际发生率）', target: '< 5%（目标值）', change: '上升（较上月 5% 上升 1%，因新药品增多）' },
    { id: 'RT-004', indicatorName: '医院感染风险事件数', month: '2026-10（本月）', value: '8 起（本月实际发生数）', target: '< 10 起/月（目标值）', change: '下降（较上月 10 起 下降 2 起，因加强了感染防控）' },
    { id: 'RT-005', indicatorName: '患者投诉率', month: '2026-10（本月）', value: '1.5 起/千门诊量（本月实际投诉率）', target: '< 2 起/千门诊量（目标值）', change: '下降（较上月 2.0 起 下降 0.5 起，因改善了医疗服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/benchmarks - 风险基准 5 条 */
async function handleRiskBenchmarks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RB-001', indicatorName: '医疗纠纷发生率', ourHospital: '0.8 起/百出院患者（本院本月实际发生率）', peerAverage: '1.0 起/百出院患者（同级医院平均发生率）', rank: '排名前 25%（优于 75% 的同级医院）', difference: '优于同级均值 20%（本院 0.8 起 vs 同级 1.0 起）' },
    { id: 'RB-002', indicatorName: '医疗差错发生率', ourHospital: '0.3%（本院本月实际发生率）', peerAverage: '0.4%（同级医院平均发生率）', rank: '排名前 20%（优于 80% 的同级医院）', difference: '优于同级均值 25%（本院 0.3% vs 同级 0.4%）' },
    { id: 'RB-003', indicatorName: '药品不良反应发生率', ourHospital: '6%（本院本月实际发生率）', peerAverage: '5%（同级医院平均发生率）', rank: '排名后 30%（劣于 70% 的同级医院）', difference: '劣于同级均值 20%（本院 6% vs 同级 5%）' },
    { id: 'RB-004', indicatorName: '医院感染风险事件数', ourHospital: '8 起（本院本月实际发生数）', peerAverage: '10 起（同级医院平均发生数）', rank: '排名前 25%（优于 75% 的同级医院）', difference: '优于同级均值 20%（本院 8 起 vs 同级 10 起）' },
    { id: 'RB-005', indicatorName: '患者投诉率', ourHospital: '1.5 起/千门诊量（本院本月实际投诉率）', peerAverage: '2.0 起/千门诊量（同级医院平均投诉率）', rank: '排名前 20%（优于 80% 的同级医院）', difference: '优于同级均值 25%（本院 1.5 起 vs 同级 2.0 起）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/alerts - 风险预警 5 条 */
async function handleRiskAlerts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RA-001', alertName: '药品不良反应发生率超标预警', indicator: '药品不良反应发生率', threshold: '> 5%（超过目标值即触发预警）', currentValue: '6%（本月实际发生率，已超过阈值）', level: '黄色预警（中度风险，需关注）' },
    { id: 'RA-002', alertName: '医疗纠纷发生率上升预警', indicator: '医疗纠纷发生率', threshold: '较上月上升 > 20%（较上月大幅上升即触发预警）', currentValue: '较上月下降 20%（本月 0.8 起 vs 上月 1.0 起，未触发预警）', level: '绿色（正常，未触发预警）' },
    { id: 'RA-003', alertName: '医疗差错发生率上升预警', indicator: '医疗差错发生率', threshold: '较上月上升 > 20%（较上月大幅上升即触发预警）', currentValue: '较上月持平（本月 0.3% vs 上月 0.3%，未触发预警）', level: '绿色（正常，未触发预警）' },
    { id: 'RA-004', alertName: '医院感染风险事件数超标预警', indicator: '医院感染风险事件数', threshold: '> 10 起/月（超过目标值即触发预警）', currentValue: '8 起（本月实际发生数，未超过阈值）', level: '绿色（正常，未触发预警）' },
    { id: 'RA-005', alertName: '患者投诉率上升预警', indicator: '患者投诉率', threshold: '较上月上升 > 20%（较上月大幅上升即触发预警）', currentValue: '较上月下降 25%（本月 1.5 起 vs 上月 2.0 起，未触发预警）', level: '绿色（正常，未触发预警）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/risk/reports - 风险报告 5 条 */
async function handleRiskReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RR-001', reportName: '2026 年 10 月医疗风险月度报告', period: '2026-10（本月）', indicator: '医疗纠纷发生率（0.8 起/百出院患者）、医疗差错发生率（0.3%）、药品不良反应发生率（6%）、医院感染风险事件数（8 起）、患者投诉率（1.5 起/千门诊量）', findings: '医疗纠纷发生率达标（优于目标值 20%）、医疗差错发生率达标（优于目标值 40%）、药品不良反应发生率未达标（高于目标值 20%）、医院感染风险事件数达标（优于目标值 20%）、患者投诉率达标（优于目标值 25%）', suggestions: '加强药品不良反应监测（增加药师监测力度）、继续加强医患沟通、继续加强感染防控' },
    { id: 'RR-002', reportName: '2026 年 Q3 医疗风险季度报告', period: '2026-07 至 2026-09（Q3）', indicator: '医疗纠纷发生率（0.9 起/百出院患者）、医疗差错发生率（0.35%）、药品不良反应发生率（5.5%）、医院感染风险事件数（9 起）、患者投诉率（1.8 起/千门诊量）', findings: '医疗纠纷发生率达标（优于目标值 10%）、医疗差错发生率达标（优于目标值 30%）、药品不良反应发生率接近目标值（略高于目标值）、医院感染风险事件数达标（优于目标值 10%）、患者投诉率达标（优于目标值 10%）', suggestions: '继续加强药品不良反应监测（增加药师监测力度）、继续加强医患沟通' },
    { id: 'RR-003', reportName: '2026 年医疗风险年度分析报告', period: '2026-01 至 2026-10（年初至今）', indicator: '医疗纠纷发生率（0.9 起/百出院患者）、医疗差错发生率（0.35%）、药品不良反应发生率（5.5%）、医院感染风险事件数（9 起）、患者投诉率（1.8 起/千门诊量）', findings: '医疗纠纷发生率达标（优于目标值 10%）、医疗差错发生率达标（优于目标值 30%）、药品不良反应发生率接近目标值（略高于目标值）、医院感染风险事件数达标（优于目标值 10%）、患者投诉率达标（优于目标值 10%）', suggestions: '继续加强药品不良反应监测（增加药师监测力度）、继续加强医患沟通、继续加强感染防控' },
    { id: 'RR-004', reportName: '心内科医疗风险专项报告', period: '2026-10（本月）', indicator: '心内科医疗纠纷发生率（0.6 起/百出院患者）、医疗差错发生率（0.25%）、药品不良反应发生率（5%）、医院感染风险事件数（5 起）、患者投诉率（1.2 起/千门诊量）', findings: '心内科医疗风险整体低于全院平均水平（医疗纠纷发生率 0.6 起 vs 全院 0.8 起、医疗差错发生率 0.25% vs 全院 0.3%、药品不良反应发生率 5% vs 全院 6%、医院感染风险事件数 5 起 vs 全院 8 起、患者投诉率 1.2 起 vs 全院 1.5 起）', suggestions: '继续保持心内科低风险优势、总结心内科风险防控经验并推广到其他科室' },
    { id: 'RR-005', reportName: '急诊科医疗风险专项报告', period: '2026-10（本月）', indicator: '急诊科医疗纠纷发生率（1.5 起/百出院患者）、医疗差错发生率（0.5%）、药品不良反应发生率（8%）、医院感染风险事件数（15 起）、患者投诉率（3.0 起/千门诊量）', findings: '急诊科医疗风险整体高于全院平均水平（医疗纠纷发生率 1.5 起 vs 全院 0.8 起、医疗差错发生率 0.5% vs 全院 0.3%、药品不良反应发生率 8% vs 全院 6%、医院感染风险事件数 15 起 vs 全院 8 起、患者投诉率 3.0 起 vs 全院 1.5 起）', suggestions: '加强急诊科医患沟通（增加沟通培训）、加强急诊科药品不良反应监测（增加药师审核力度）、加强急诊科感染防控' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m356Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/risk/indicators', handle: handleRiskIndicators, auth: true },
  { method: 'GET', path: '/api/v1/risk/scores', handle: handleRiskScores, auth: true },
  { method: 'GET', path: '/api/v1/risk/trends', handle: handleRiskTrends, auth: true },
  { method: 'GET', path: '/api/v1/risk/benchmarks', handle: handleRiskBenchmarks, auth: true },
  { method: 'GET', path: '/api/v1/risk/alerts', handle: handleRiskAlerts, auth: true },
  { method: 'GET', path: '/api/v1/risk/reports', handle: handleRiskReports, auth: true },
];
