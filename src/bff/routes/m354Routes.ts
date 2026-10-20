/**
 * 健澜科技 jlmedaios - M354 P0 合规改造：护理 NQI 深度打磨
 *
 * NQI 指标/趋势/基准/预警/报告（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/nqi-indicators - NQI 指标 5 条 */
async function handleNursingNqiIndicators(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNI-001', indicatorName: '护理不良事件发生率', targetValue: '< 0.5%（每千住院日不良事件数）', actualValue: '0.3%（本月实际发生率）', complianceRate: '达标（优于目标值 40%）', trend: '下降（较上月下降 0.1%，因加强了护理风险防控）' },
    { id: 'NNI-002', indicatorName: '压疮发生率', targetValue: '< 0.2%（住院患者压疮发生率）', actualValue: '0.15%（本月实际发生率）', complianceRate: '达标（优于目标值 25%）', trend: '稳定（较上月持平，波动 < 10%）' },
    { id: 'NNI-003', indicatorName: '跌倒发生率', targetValue: '< 0.3%（每千住院日跌倒数）', actualValue: '0.4%（本月实际发生率）', complianceRate: '未达标（高于目标值 33%）', trend: '上升（较上月上升 0.1%，因老年患者增多）' },
    { id: 'NNI-004', indicatorName: '护理文书书写合格率', targetValue: '> 95%（护理文书合格率）', actualValue: '92%（本月实际合格率）', complianceRate: '未达标（低于目标值 3%）', trend: '下降（较上月下降 2%，因新护士增多）' },
    { id: 'NNI-005', indicatorName: '患者护理满意度', targetValue: '> 90 分（百分制）', actualValue: '93 分（本月实际满意度）', complianceRate: '达标（优于目标值 3%）', trend: '上升（较上月上升 1 分，因改善了护理服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-trends - NQI 趋势 5 条 */
async function handleNursingNqiTrends(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNT-001', indicatorName: '护理不良事件发生率', month: '2026-10（本月）', value: '0.3%（本月实际发生率）', target: '< 0.5%（目标值）', change: '下降（较上月 0.4% 下降 0.1%，因加强了护理风险防控）' },
    { id: 'NNT-002', indicatorName: '压疮发生率', month: '2026-10（本月）', value: '0.15%（本月实际发生率）', target: '< 0.2%（目标值）', change: '稳定（较上月 0.15% 持平，波动 < 10%）' },
    { id: 'NNT-003', indicatorName: '跌倒发生率', month: '2026-10（本月）', value: '0.4%（本月实际发生率）', target: '< 0.3%（目标值）', change: '上升（较上月 0.3% 上升 0.1%，因老年患者增多）' },
    { id: 'NNT-004', indicatorName: '护理文书书写合格率', month: '2026-10（本月）', value: '92%（本月实际合格率）', target: '> 95%（目标值）', change: '下降（较上月 94% 下降 2%，因新护士增多）' },
    { id: 'NNT-005', indicatorName: '患者护理满意度', month: '2026-10（本月）', value: '93 分（本月实际满意度）', target: '> 90 分（目标值）', change: '上升（较上月 92 分 上升 1 分，因改善了护理服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-benchmarks - NQI 基准 5 条 */
async function handleNursingNqiBenchmarks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNB-001', indicatorName: '护理不良事件发生率', ourHospital: '0.3%（本院本月实际发生率）', peerAverage: '0.4%（同级医院平均发生率）', rank: '排名前 20%（优于 80% 的同级医院）', difference: '优于同级均值 25%（本院 0.3% vs 同级 0.4%）' },
    { id: 'NNB-002', indicatorName: '压疮发生率', ourHospital: '0.15%（本院本月实际发生率）', peerAverage: '0.2%（同级医院平均发生率）', rank: '排名前 30%（优于 70% 的同级医院）', difference: '优于同级均值 25%（本院 0.15% vs 同级 0.2%）' },
    { id: 'NNB-003', indicatorName: '跌倒发生率', ourHospital: '0.4%（本院本月实际发生率）', peerAverage: '0.3%（同级医院平均发生率）', rank: '排名后 30%（劣于 70% 的同级医院）', difference: '劣于同级均值 33%（本院 0.4% vs 同级 0.3%）' },
    { id: 'NNB-004', indicatorName: '护理文书书写合格率', ourHospital: '92%（本院本月实际合格率）', peerAverage: '94%（同级医院平均合格率）', rank: '排名后 40%（劣于 60% 的同级医院）', difference: '劣于同级均值 2%（本院 92% vs 同级 94%）' },
    { id: 'NNB-005', indicatorName: '患者护理满意度', ourHospital: '93 分（本院本月实际满意度）', peerAverage: '91 分（同级医院平均满意度）', rank: '排名前 25%（优于 75% 的同级医院）', difference: '优于同级均值 2 分（本院 93 分 vs 同级 91 分）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-alerts - NQI 预警 5 条 */
async function handleNursingNqiAlerts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNA-001', alertName: '跌倒发生率超标预警', indicator: '跌倒发生率', threshold: '> 0.3%（超过目标值即触发预警）', currentValue: '0.4%（本月实际发生率，已超过阈值）', level: '黄色预警（中度风险，需关注）' },
    { id: 'NNA-002', indicator: '护理文书书写合格率', threshold: '< 95%（低于目标值即触发预警）', currentValue: '92%（本月实际合格率，已低于阈值）', level: '黄色预警（中度风险，需关注）' },
    { id: 'NNA-003', alertName: '护理不良事件上升预警', indicator: '护理不良事件发生率', threshold: '较上月上升 > 20%（较上月大幅上升即触发预警）', currentValue: '较上月上升 10%（本月 0.3% vs 上月 0.4%，下降 25%，未触发预警）', level: '绿色（正常，未触发预警）' },
    { id: 'NNA-004', alertName: '压疮发生率上升预警', indicator: '压疮发生率', threshold: '较上月上升 > 20%（较上月大幅上升即触发预警）', currentValue: '较上月持平（本月 0.15% vs 上月 0.15%，未触发预警）', level: '绿色（正常，未触发预警）' },
    { id: 'NNA-005', alertName: '患者满意度下降预警', indicator: '患者护理满意度', threshold: '较上月下降 > 5%（较上月大幅下降即触发预警）', currentValue: '较上月上升 1%（本月 93 分 vs 上月 92 分，未触发预警）', level: '绿色（正常，未触发预警）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-reports - NQI 报告 5 条 */
async function handleNursingNqiReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNR-001', reportName: '2026 年 10 月护理质量指标月度报告', period: '2026-10（本月）', indicator: '护理不良事件发生率（0.3%）、压疮发生率（0.15%）、跌倒发生率（0.4%）、护理文书书写合格率（92%）、患者护理满意度（93 分）', findings: '护理不良事件发生率达标（优于目标值）、压疮发生率达标（优于目标值）、跌倒发生率未达标（高于目标值）、护理文书书写合格率未达标（低于目标值）、患者护理满意度达标（优于目标值）', suggestions: '加强老年患者跌倒风险防控（增加陪护、安装扶手）、加强新护士护理文书书写培训（每周 1 次）' },
    { id: 'NNR-002', reportName: '2026 年 Q3 护理质量季度报告', period: '2026-07 至 2026-09（Q3）', indicator: '护理不良事件发生率（0.35%）、压疮发生率（0.16%）、跌倒发生率（0.35%）、护理文书书写合格率（93%）、患者护理满意度（92 分）', findings: '护理不良事件发生率达标（优于目标值）、压疮发生率达标（优于目标值）、跌倒发生率接近目标值（略高于目标值）、护理文书书写合格率接近目标值（略低于目标值）、患者护理满意度达标（优于目标值）', suggestions: '继续加强跌倒风险防控（增加陪护、安装扶手）、继续加强护理文书书写培训（每周 1 次）' },
    { id: 'NNR-003', reportName: '2026 年护理质量年度分析报告', period: '2026-01 至 2026-10（年初至今）', indicator: '护理不良事件发生率（0.38%）、压疮发生率（0.18%）、跌倒发生率（0.32%）、护理文书书写合格率（93%）、患者护理满意度（92 分）', findings: '护理不良事件发生率达标（优于目标值）、压疮发生率达标（优于目标值）、跌倒发生率达标（优于目标值）、护理文书书写合格率接近目标值（略低于目标值）、患者护理满意度达标（优于目标值）', suggestions: '继续加强护理文书书写培训（每周 1 次）、继续保持跌倒风险防控措施' },
    { id: 'NNR-004', reportName: '心内科护理质量专项报告', period: '2026-10（本月）', indicator: '心内科护理不良事件发生率（0.25%）、压疮发生率（0.1%）、跌倒发生率（0.3%）、护理文书书写合格率（95%）、患者护理满意度（94 分）', findings: '心内科护理质量整体优于全院平均水平（护理不良事件发生率 0.25% vs 全院 0.3%、压疮发生率 0.1% vs 全院 0.15%、跌倒发生率 0.3% vs 全院 0.4%、护理文书书写合格率 95% vs 全院 92%、患者护理满意度 94 分 vs 全院 93 分）', suggestions: '继续保持心内科护理质量优势、总结心内科护理经验并推广到其他科室' },
    { id: 'NNR-005', reportName: '骨科护理质量专项报告', period: '2026-10（本月）', indicator: '骨科护理不良事件发生率（0.4%）、压疮发生率（0.2%）、跌倒发生率（0.5%）、护理文书书写合格率（90%）、患者护理满意度（91 分）', findings: '骨科护理质量整体低于全院平均水平（护理不良事件发生率 0.4% vs 全院 0.3%、压疮发生率 0.2% vs 全院 0.15%、跌倒发生率 0.5% vs 全院 0.4%、护理文书书写合格率 90% vs 全院 92%、患者护理满意度 91 分 vs 全院 93 分）', suggestions: '加强骨科护理风险防控（增加陪护、安装扶手）、加强骨科护士护理文书书写培训（每周 2 次）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m354Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/nqi-indicators', handle: handleNursingNqiIndicators, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-trends', handle: handleNursingNqiTrends, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-benchmarks', handle: handleNursingNqiBenchmarks, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-alerts', handle: handleNursingNqiAlerts, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-reports', handle: handleNursingNqiReports, auth: true },
];
