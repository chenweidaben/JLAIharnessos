/**
 * 健澜科技 jlmedaios - M364 P1 业务扩展：运营管理深度打磨
 *
 * 运营看板/KPI/报告/分析/预测/对标
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/operations/dashboard - 运营看板 5 条 */
async function handleOperationsDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OD-001', metricName: '日均门诊量', value: '3,500 人次/日', unit: '人次/日（今日门诊量）', trend: '稳定（较昨日持平，波动 < 5%）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'OD-002', metricName: '日均住院量', value: '500 人/日', unit: '人/日（当前在院人数）', trend: '上升（较昨日上升 10 人，因秋季呼吸道疾病增多）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'OD-003', metricName: '床位使用率', value: '85%', unit: '%（实际使用床位/总床位）', trend: '稳定（较昨日持平，波动 < 5%）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'OD-004', metricName: '平均住院日', value: '8.5 天', unit: '天（患者平均住院天数）', trend: '下降（较昨日下降 0.5 天，因加强了日间手术）', time: '2026-10-20 15:00:00（实时统计）' },
    { id: 'OD-005', metricName: '手术量', value: '50 台/日', unit: '台/日（今日手术量）', trend: '稳定（较昨日持平，波动 < 5%）', time: '2026-10-20 15:00:00（实时统计）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/kpi - KPI 指标 5 条 */
async function handleOperationsKpi(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OK-001', metricName: '门诊收入', targetValue: '500 万元/月', actualValue: '480 万元/月（本月实际收入）', complianceRate: '96%（达标率）', trend: '稳定（较上月持平，波动 < 5%）' },
    { id: 'OK-002', metricName: '住院收入', targetValue: '800 万元/月', actualValue: '750 万元/月（本月实际收入）', complianceRate: '94%（达标率）', trend: '上升（较上月上升 5%，因住院量增加）' },
    { id: 'OK-003', metricName: '药品收入占比', targetValue: '< 40%（药品收入/总收入）', actualValue: '38%（本月实际占比）', complianceRate: '达标（优于目标值 2%）', trend: '下降（较上月下降 2%，因加强了合理用药管理）' },
    { id: 'OK-004', metricName: '医疗服务收入占比', targetValue: '> 60%（医疗服务收入/总收入）', actualValue: '62%（本月实际占比）', complianceRate: '达标（优于目标值 2%）', trend: '上升（较上月上升 2%，因加强了医疗服务价格管理）' },
    { id: 'OK-005', metricName: '患者满意度', targetValue: '> 90 分（百分制）', actualValue: '92 分（本月实际满意度）', complianceRate: '达标（优于目标值 2%）', trend: '上升（较上月上升 1 分，因改善了医疗服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/reports - 运营报告 5 条 */
async function handleOperationsReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OR-001', reportName: '2026 年 10 月运营月度报告', period: '2026-10（本月）', metric: '门诊收入（480 万元）、住院收入（750 万元）、药品收入占比（38%）、医疗服务收入占比（62%）、患者满意度（92 分）', findings: '门诊收入达标率 96%（略低于目标值）、住院收入达标率 94%（略低于目标值）、药品收入占比达标（优于目标值）、医疗服务收入占比达标（优于目标值）、患者满意度达标（优于目标值）', suggestions: '继续加强门诊管理（增加门诊号源）、继续加强合理用药管理' },
    { id: 'OR-002', reportName: '2026 年 Q3 运营季度报告', period: '2026-07 至 2026-09（Q3）', metric: '门诊收入（1,450 万元）、住院收入（2,200 万元）、药品收入占比（40%）、医疗服务收入占比（60%）、患者满意度（91 分）', findings: '门诊收入达标率 97%（略低于目标值）、住院收入达标率 92%（略低于目标值）、药品收入占比达标（等于目标值）、医疗服务收入占比达标（等于目标值）、患者满意度达标（优于目标值 1%）', suggestions: '继续加强门诊管理（增加门诊号源）、继续加强合理用药管理' },
    { id: 'OR-003', reportName: '2026 年运营年度分析报告', period: '2026-01 至 2026-10（年初至今）', metric: '门诊收入（4,300 万元）、住院收入（6,800 万元）、药品收入占比（41%）、医疗服务收入占比（59%）、患者满意度（91 分）', findings: '门诊收入达标率 95%（略低于目标值）、住院收入达标率 93%（略低于目标值）、药品收入占比接近目标值（略高于目标值）、医疗服务收入占比接近目标值（略低于目标值）、患者满意度达标（优于目标值 1%）', suggestions: '继续加强门诊管理（增加门诊号源）、继续加强合理用药管理、继续加强医疗服务价格管理' },
    { id: 'OR-004', reportName: '心内科运营专项报告', period: '2026-10（本月）', metric: '心内科门诊收入（80 万元）、心内科住院收入（150 万元）、心内科药品收入占比（45%）、心内科医疗服务收入占比（55%）、心内科患者满意度（94 分）', findings: '心内科运营情况整体优于全院平均水平（门诊收入 80 万元 vs 全院 480 万元、住院收入 150 万元 vs 全院 750 万元、患者满意度 94 分 vs 全院 92 分）', suggestions: '继续保持心内科运营优势、总结心内科运营经验并推广到其他科室' },
    { id: 'OR-005', reportName: '急诊科运营专项报告', period: '2026-10（本月）', metric: '急诊科门诊收入（50 万元）、急诊科住院收入（30 万元）、急诊科药品收入占比（50%）、急诊科医疗服务收入占比（50%）、急诊科患者满意度（85 分）', findings: '急诊科运营情况整体低于全院平均水平（门诊收入 50 万元 vs 全院 480 万元、住院收入 30 万元 vs 全院 750 万元、患者满意度 85 分 vs 全院 92 分）', suggestions: '加强急诊科管理（增加急诊医生、改善急诊服务流程）、加强急诊科合理用药管理' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/analysis - 运营分析 5 条 */
async function handleOperationsAnalysis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OA-001', analysisName: '门诊量趋势分析', dimension: '时间维度（近 12 个月门诊量变化趋势）', metric: '日均门诊量（从 3,000 人次上升到 3,500 人次，增长 17%）', conclusion: '门诊量呈上升趋势，主要原因是医院知名度提升、周边人口增长', time: '2026-10-20（分析时间）' },
    { id: 'OA-002', analysisName: '住院收入结构分析', dimension: '收入结构维度（住院收入构成分析）', metric: '药品收入占比（38%）、检查收入占比（20%）、治疗收入占比（30%）、其他收入占比（12%）', conclusion: '住院收入结构合理，药品收入占比已控制在 40% 以下，符合国家政策要求', time: '2026-10-20（分析时间）' },
    { id: 'OA-003', analysisName: '科室运营效率对比分析', dimension: '科室维度（各科室运营效率对比）', metric: '心内科（人均收入 150 万元）、骨科（人均收入 120 万元）、普外科（人均收入 100 万元）', conclusion: '心内科运营效率最高，普外科运营效率最低，需加强普外科管理', time: '2026-10-20（分析时间）' },
    { id: 'OA-004', analysisName: '患者满意度影响因素分析', dimension: '患者维度（影响满意度的因素分析）', metric: '医生态度（影响满意度 40%）、等待时间（影响满意度 30%）、医疗技术（影响满意度 20%）、环境设施（影响满意度 10%）', conclusion: '医生态度是影响满意度的最主要因素，需加强医生沟通培训', time: '2026-10-20（分析时间）' },
    { id: 'OA-005', analysisName: '成本控制分析', dimension: '成本维度（医院成本构成分析）', metric: '人力成本（占总成本 50%）、药品成本（占总成本 30%）、设备成本（占总成本 10%）、其他成本（占总成本 10%）', conclusion: '人力成本是最大的成本项，需优化人力资源配置', time: '2026-10-20（分析时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/forecast - 运营预测 5 条 */
async function handleOperationsForecast(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OF-001', forecastName: '2026 年 Q4 门诊量预测', metric: '日均门诊量', forecastValue: '3,600 人次/日（预测 Q4 日均门诊量）', actualValue: '3,500 人次/日（本月实际日均门诊量）', accuracy: '95%（预测准确率，基于历史数据趋势外推）' },
    { id: 'OF-002', forecastName: '2026 年 Q4 住院收入预测', metric: '月住院收入', forecastValue: '800 万元/月（预测 Q4 月住院收入）', actualValue: '750 万元/月（本月实际住院收入）', accuracy: '92%（预测准确率，基于历史数据趋势外推）' },
    { id: 'OF-003', forecastName: '2026 年 Q4 药品收入占比预测', metric: '药品收入占比', forecastValue: '37%（预测 Q4 药品收入占比）', actualValue: '38%（本月实际药品收入占比）', accuracy: '90%（预测准确率，基于合理用药管理趋势）' },
    { id: 'OF-004', forecastName: '2026 年 Q4 患者满意度预测', metric: '患者满意度', forecastValue: '93 分（预测 Q4 患者满意度）', actualValue: '92 分（本月实际患者满意度）', accuracy: '95%（预测准确率，基于服务改善趋势）' },
    { id: 'OF-005', forecastName: '2026 年 Q4 手术量预测', metric: '日均手术量', forecastValue: '55 台/日（预测 Q4 日均手术量）', actualValue: '50 台/日（今日实际手术量）', accuracy: '88%（预测准确率，基于日间手术推广趋势）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/benchmark - 运营对标 5 条 */
async function handleOperationsBenchmark(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OB-001', metricName: '日均门诊量', ourHospital: '3,500 人次/日（本院）', peerAverage: '4,000 人次/日（同级医院平均）', rank: '排名后 30%（劣于 70% 的同级医院）', difference: '劣于同级均值 12.5%（本院 3,500 人次 vs 同级 4,000 人次）' },
    { id: 'OB-002', metricName: '床位使用率', ourHospital: '85%（本院）', peerAverage: '90%（同级医院平均）', rank: '排名后 40%（劣于 60% 的同级医院）', difference: '劣于同级均值 5%（本院 85% vs 同级 90%）' },
    { id: 'OB-003', metricName: '平均住院日', ourHospital: '8.5 天（本院）', peerAverage: '7.5 天（同级医院平均）', rank: '排名后 30%（劣于 70% 的同级医院）', difference: '劣于同级均值 13.3%（本院 8.5 天 vs 同级 7.5 天）' },
    { id: 'OB-004', metricName: '药品收入占比', ourHospital: '38%（本院）', peerAverage: '35%（同级医院平均）', rank: '排名后 30%（劣于 70% 的同级医院）', difference: '劣于同级均值 3%（本院 38% vs 同级 35%）' },
    { id: 'OB-005', metricName: '患者满意度', ourHospital: '92 分（本院）', peerAverage: '91 分（同级医院平均）', rank: '排名前 25%（优于 75% 的同级医院）', difference: '优于同级均值 1 分（本院 92 分 vs 同级 91 分）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m364Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/operations/dashboard', handle: handleOperationsDashboard, auth: true },
  { method: 'GET', path: '/api/v1/operations/kpi', handle: handleOperationsKpi, auth: true },
  { method: 'GET', path: '/api/v1/operations/reports', handle: handleOperationsReports, auth: true },
  { method: 'GET', path: '/api/v1/operations/analysis', handle: handleOperationsAnalysis, auth: true },
  { method: 'GET', path: '/api/v1/operations/forecast', handle: handleOperationsForecast, auth: true },
  { method: 'GET', path: '/api/v1/operations/benchmark', handle: handleOperationsBenchmark, auth: true },
];
