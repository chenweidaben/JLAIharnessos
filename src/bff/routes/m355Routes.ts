/**
 * 健澜科技 jlmedaios - M355 P0 合规改造：质量控制深度打磨
 *
 * 质控指标/评分/趋势/基准/预警/报告（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/quality/indicators - 质控指标 5 条 */
async function handleQualityIndicators(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QI-001', indicatorName: '病历书写合格率', targetValue: '> 95%（住院病历合格率）', actualValue: '93%（本月实际合格率）', complianceRate: '未达标（低于目标值 2%）', trend: '下降（较上月下降 1%，因新医师增多）' },
    { id: 'QI-002', indicatorName: '处方合格率', targetValue: '> 98%（门诊处方合格率）', actualValue: '96%（本月实际合格率）', complianceRate: '未达标（低于目标值 2%）', trend: '稳定（较上月持平，波动 < 5%）' },
    { id: 'QI-003', indicatorName: '医院感染发生率', targetValue: '< 5%（住院患者医院感染率）', actualValue: '3.5%（本月实际发生率）', complianceRate: '达标（优于目标值 30%）', trend: '下降（较上月下降 0.5%，因加强了感染防控）' },
    { id: 'QI-004', indicatorName: '抗菌药物使用强度', targetValue: '< 40 DDD/100 人天', actualValue: '35 DDD/100 人天（本月实际使用强度）', complianceRate: '达标（优于目标值 12.5%）', trend: '下降（较上月下降 5 DDD，因加强了抗菌药物管理）' },
    { id: 'QI-005', indicatorName: '患者满意度', targetValue: '> 90 分（百分制）', actualValue: '92 分（本月实际满意度）', complianceRate: '达标（优于目标值 2%）', trend: '上升（较上月上升 1 分，因改善了医疗服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/scores - 质控评分 5 条 */
async function handleQualityScores(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QS-001', department: '心内科', indicator: '病历书写合格率（95 分）、处方合格率（98 分）、医院感染发生率（90 分）、抗菌药物使用强度（85 分）、患者满意度（92 分）', score: '92 分（总分 100 分）', fullScore: '100 分', grade: 'A 级（优秀，排名全院前 10%）' },
    { id: 'QS-002', department: '骨科', indicator: '病历书写合格率（90 分）、处方合格率（95 分）、医院感染发生率（85 分）、抗菌药物使用强度（80 分）、患者满意度（90 分）', score: '88 分（总分 100 分）', fullScore: '100 分', grade: 'B 级（良好，排名全院前 30%）' },
    { id: 'QS-003', department: '普外科', indicator: '病历书写合格率（88 分）、处方合格率（93 分）、医院感染发生率（82 分）、抗菌药物使用强度（78 分）、患者满意度（88 分）', score: '86 分（总分 100 分）', fullScore: '100 分', grade: 'B 级（良好，排名全院前 50%）' },
    { id: 'QS-004', department: '呼吸内科', indicator: '病历书写合格率（92 分）、处方合格率（96 分）、医院感染发生率（88 分）、抗菌药物使用强度（82 分）、患者满意度（91 分）', score: '90 分（总分 100 分）', fullScore: '100 分', grade: 'A 级（优秀，排名全院前 20%）' },
    { id: 'QS-005', department: '急诊科', indicator: '病历书写合格率（85 分）、处方合格率（90 分）、医院感染发生率（78 分）、抗菌药物使用强度（75 分）、患者满意度（85 分）', score: '83 分（总分 100 分）', fullScore: '100 分', grade: 'C 级（一般，排名全院后 30%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/trends - 质控趋势 5 条 */
async function handleQualityTrends(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QT-001', indicatorName: '病历书写合格率', month: '2026-10（本月）', value: '93%（本月实际合格率）', target: '> 95%（目标值）', change: '下降（较上月 94% 下降 1%，因新医师增多）' },
    { id: 'QT-002', indicatorName: '处方合格率', month: '2026-10（本月）', value: '96%（本月实际合格率）', target: '> 98%（目标值）', change: '稳定（较上月 96% 持平，波动 < 5%）' },
    { id: 'QT-003', indicatorName: '医院感染发生率', month: '2026-10（本月）', value: '3.5%（本月实际发生率）', target: '< 5%（目标值）', change: '下降（较上月 4.0% 下降 0.5%，因加强了感染防控）' },
    { id: 'QT-004', indicatorName: '抗菌药物使用强度', month: '2026-10（本月）', value: '35 DDD/100 人天（本月实际使用强度）', target: '< 40 DDD/100 人天（目标值）', change: '下降（较上月 40 DDD 下降 5 DDD，因加强了抗菌药物管理）' },
    { id: 'QT-005', indicatorName: '患者满意度', month: '2026-10（本月）', value: '92 分（本月实际满意度）', target: '> 90 分（目标值）', change: '上升（较上月 91 分 上升 1 分，因改善了医疗服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/benchmarks - 质控基准 5 条 */
async function handleQualityBenchmarks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QB-001', indicatorName: '病历书写合格率', ourHospital: '93%（本院本月实际合格率）', peerAverage: '94%（同级医院平均合格率）', rank: '排名后 30%（劣于 70% 的同级医院）', difference: '劣于同级均值 1%（本院 93% vs 同级 94%）' },
    { id: 'QB-002', indicatorName: '处方合格率', ourHospital: '96%（本院本月实际合格率）', peerAverage: '97%（同级医院平均合格率）', rank: '排名后 40%（劣于 60% 的同级医院）', difference: '劣于同级均值 1%（本院 96% vs 同级 97%）' },
    { id: 'QB-003', indicatorName: '医院感染发生率', ourHospital: '3.5%（本院本月实际发生率）', peerAverage: '4.0%（同级医院平均发生率）', rank: '排名前 25%（优于 75% 的同级医院）', difference: '优于同级均值 12.5%（本院 3.5% vs 同级 4.0%）' },
    { id: 'QB-004', indicatorName: '抗菌药物使用强度', ourHospital: '35 DDD/100 人天（本院本月实际使用强度）', peerAverage: '38 DDD/100 人天（同级医院平均使用强度）', rank: '排名前 30%（优于 70% 的同级医院）', difference: '优于同级均值 7.9%（本院 35 DDD vs 同级 38 DDD）' },
    { id: 'QB-005', indicatorName: '患者满意度', ourHospital: '92 分（本院本月实际满意度）', peerAverage: '91 分（同级医院平均满意度）', rank: '排名前 25%（优于 75% 的同级医院）', difference: '优于同级均值 1 分（本院 92 分 vs 同级 91 分）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/alerts - 质控预警 5 条 */
async function handleQualityAlerts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QA-001', alertName: '病历书写合格率下降预警', indicator: '病历书写合格率', threshold: '< 95%（低于目标值即触发预警）', currentValue: '93%（本月实际合格率，已低于阈值）', level: '黄色预警（中度风险，需关注）' },
    { id: 'QA-002', alertName: '处方合格率下降预警', indicator: '处方合格率', threshold: '< 98%（低于目标值即触发预警）', currentValue: '96%（本月实际合格率，已低于阈值）', level: '黄色预警（中度风险，需关注）' },
    { id: 'QA-003', alertName: '医院感染发生率上升预警', indicator: '医院感染发生率', threshold: '> 5%（超过目标值即触发预警）', currentValue: '3.5%（本月实际发生率，未超过阈值）', level: '绿色（正常，未触发预警）' },
    { id: 'QA-004', alertName: '抗菌药物使用强度超标预警', indicator: '抗菌药物使用强度', threshold: '> 40 DDD/100 人天（超过目标值即触发预警）', currentValue: '35 DDD/100 人天（本月实际使用强度，未超过阈值）', level: '绿色（正常，未触发预警）' },
    { id: 'QA-005', alertName: '患者满意度下降预警', indicator: '患者满意度', threshold: '< 90 分（低于目标值即触发预警）', currentValue: '92 分（本月实际满意度，未低于阈值）', level: '绿色（正常，未触发预警）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/reports - 质控报告 5 条 */
async function handleQualityReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QR-001', reportName: '2026 年 10 月医疗质量月度报告', period: '2026-10（本月）', indicator: '病历书写合格率（93%）、处方合格率（96%）、医院感染发生率（3.5%）、抗菌药物使用强度（35 DDD）、患者满意度（92 分）', findings: '病历书写合格率未达标（低于目标值 2%）、处方合格率未达标（低于目标值 2%）、医院感染发生率达标（优于目标值 30%）、抗菌药物使用强度达标（优于目标值 12.5%）、患者满意度达标（优于目标值 2%）', suggestions: '加强新医师病历书写培训（每周 1 次）、加强处方审核（增加药师审核力度）' },
    { id: 'QR-002', reportName: '2026 年 Q3 医疗质量季度报告', period: '2026-07 至 2026-09（Q3）', indicator: '病历书写合格率（94%）、处方合格率（97%）、医院感染发生率（4.0%）、抗菌药物使用强度（38 DDD）、患者满意度（91 分）', findings: '病历书写合格率接近目标值（略低于目标值）、处方合格率接近目标值（略低于目标值）、医院感染发生率达标（优于目标值 20%）、抗菌药物使用强度达标（优于目标值 5%）、患者满意度达标（优于目标值 1%）', suggestions: '继续加强病历书写培训（每周 1 次）、继续加强处方审核（增加药师审核力度）' },
    { id: 'QR-003', reportName: '2026 年医疗质量年度分析报告', period: '2026-01 至 2026-10（年初至今）', indicator: '病历书写合格率（94%）、处方合格率（97%）、医院感染发生率（4.2%）、抗菌药物使用强度（39 DDD）、患者满意度（91 分）', findings: '病历书写合格率接近目标值（略低于目标值）、处方合格率接近目标值（略低于目标值）、医院感染发生率达标（优于目标值 16%）、抗菌药物使用强度接近目标值（略低于目标值）、患者满意度达标（优于目标值 1%）', suggestions: '继续加强病历书写培训（每周 1 次）、继续加强处方审核（增加药师审核力度）、继续加强抗菌药物管理' },
    { id: 'QR-004', reportName: '心内科医疗质量专项报告', period: '2026-10（本月）', indicator: '心内科病历书写合格率（95%）、处方合格率（98%）、医院感染发生率（3.0%）、抗菌药物使用强度（30 DDD）、患者满意度（94 分）', findings: '心内科医疗质量整体优于全院平均水平（病历书写合格率 95% vs 全院 93%、处方合格率 98% vs 全院 96%、医院感染发生率 3.0% vs 全院 3.5%、抗菌药物使用强度 30 DDD vs 全院 35 DDD、患者满意度 94 分 vs 全院 92 分）', suggestions: '继续保持心内科医疗质量优势、总结心内科医疗经验并推广到其他科室' },
    { id: 'QR-005', reportName: '急诊科医疗质量专项报告', period: '2026-10（本月）', indicator: '急诊科病历书写合格率（85%）、处方合格率（90%）、医院感染发生率（5.0%）、抗菌药物使用强度（45 DDD）、患者满意度（85 分）', findings: '急诊科医疗质量整体低于全院平均水平（病历书写合格率 85% vs 全院 93%、处方合格率 90% vs 全院 96%、医院感染发生率 5.0% vs 全院 3.5%、抗菌药物使用强度 45 DDD vs 全院 35 DDD、患者满意度 85 分 vs 全院 92 分）', suggestions: '加强急诊科医师病历书写培训（每周 2 次）、加强急诊科处方审核（增加药师审核力度）、加强急诊科感染防控' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m355Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/quality/indicators', handle: handleQualityIndicators, auth: true },
  { method: 'GET', path: '/api/v1/quality/scores', handle: handleQualityScores, auth: true },
  { method: 'GET', path: '/api/v1/quality/trends', handle: handleQualityTrends, auth: true },
  { method: 'GET', path: '/api/v1/quality/benchmarks', handle: handleQualityBenchmarks, auth: true },
  { method: 'GET', path: '/api/v1/quality/alerts', handle: handleQualityAlerts, auth: true },
  { method: 'GET', path: '/api/v1/quality/reports', handle: handleQualityReports, auth: true },
];
