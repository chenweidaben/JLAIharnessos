/**
 * 健澜科技 jlmedaios - M353 P0 合规改造：患者时间线深度打磨
 *
 * 时间线筛选/汇总/对比/导出（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/timeline-filter - 时间线筛选 5 条 */
async function handlePatientTimelineFilter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTF-001', filterName: '近 1 年就诊记录', type: '时间范围筛选', condition: '就诊时间 >= 2025-10-20（近 1 年内）', resultCount: '筛选出 12 条就诊记录（门诊 8 次、住院 2 次、急诊 2 次）', status: '可用' },
    { id: 'PTF-002', filterName: '心内科相关事件', type: '科室筛选', condition: '科室 = 心内科', resultCount: '筛选出 25 条心内科相关事件（就诊 10 次、用药 15 次）', status: '可用' },
    { id: 'PTF-003', filterName: '近 3 个月用药记录', type: '时间范围 + 类型筛选', condition: '用药时间 >= 2026-07-20（近 3 个月内） AND 事件类型 = 用药', resultCount: '筛选出 18 条用药记录（降压药 8 次、降糖药 6 次、降脂药 4 次）', status: '可用' },
    { id: 'PTF-004', filterName: '所有住院记录', type: '就诊类型筛选', condition: '就诊类型 = 住院', resultCount: '筛选出 5 条住院记录（心内科住院 3 次、骨科住院 2 次）', status: '可用' },
    { id: 'PTF-005', filterName: '检验异常事件', type: '事件类型筛选', condition: '事件类型 = 检验 AND 结果 = 异常', resultCount: '筛选出 8 条检验异常事件（血钾异常 3 次、血糖异常 3 次、肝功能异常 2 次）', status: '可用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-summary - 时间线汇总 5 条 */
async function handlePatientTimelineSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTS-001', patientName: '张***（心内科住院患者，65 岁男性）', totalEvents: '150+ 条事件（涵盖 10 年就诊历史）', visitCount: '30+ 次就诊（门诊 20 次、住院 6 次、急诊 4 次）', medicationCount: '80+ 条用药记录（长期用药 5 种、短期用药 10+ 种）', lastUpdate: '2026-10-20 15:00:00（最近 1 小时内更新）' },
    { id: 'PTS-002', patientName: '李***（骨科住院患者，55 岁女性）', totalEvents: '80+ 条事件（涵盖 5 年就诊历史）', visitCount: '15+ 次就诊（门诊 10 次、住院 4 次、急诊 1 次）', medicationCount: '40+ 条用药记录（长期用药 2 种、短期用药 5+ 种）', lastUpdate: '2026-10-20 14:00:00（最近 2 小时内更新）' },
    { id: 'PTS-003', patientName: '王***（内分泌科住院患者，60 岁男性）', totalEvents: '100+ 条事件（涵盖 8 年就诊历史）', visitCount: '20+ 次就诊（门诊 15 次、住院 3 次、急诊 2 次）', medicationCount: '60+ 条用药记录（长期用药 4 种、短期用药 8+ 种）', lastUpdate: '2026-10-20 13:00:00（最近 3 小时内更新）' },
    { id: 'PTS-004', patientName: '刘***（呼吸内科住院患者，70 岁女性）', totalEvents: '120+ 条事件（涵盖 12 年就诊历史）', visitCount: '25+ 次就诊（门诊 18 次、住院 5 次、急诊 2 次）', medicationCount: '70+ 条用药记录（长期用药 6 种、短期用药 12+ 种）', lastUpdate: '2026-10-20 12:00:00（最近 4 小时内更新）' },
    { id: 'PTS-005', patientName: '陈***（普外科住院患者，45 岁男性）', totalEvents: '50+ 条事件（涵盖 3 年就诊历史）', visitCount: '10+ 次就诊（门诊 7 次、住院 2 次、急诊 1 次）', medicationCount: '20+ 条用药记录（长期用药 1 种、短期用药 3+ 种）', lastUpdate: '2026-10-20 11:00:00（最近 5 小时内更新）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-compare - 时间线对比 5 条 */
async function handlePatientTimelineCompare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTC-001', patientA: '张***（心内科住院患者，65 岁男性，高血压 10 年病史）', patientB: '王***（心内科住院患者，63 岁男性，高血压 8 年病史）', similarity: '相同点：均为老年男性、高血压病史 8-10 年、长期服用 ACEI/ARB 类降压药、均有冠心病史', difference: '差异点：张***合并糖尿病（王***无糖尿病）、张***近期住院 2 次（王***近期住院 1 次）、张***血压控制不佳（王***血压控制良好）', similarityRate: '70%（病史、用药、就诊模式有较高相似性）' },
    { id: 'PTC-002', patientA: '李***（骨科住院患者，55 岁女性，膝关节置换术后）', patientB: '刘***（骨科住院患者，58 岁女性，髋关节置换术后）', similarity: '相同点：均为中年女性、均接受关节置换手术、术后均使用抗凝药物预防深静脉血栓、均有骨质疏松病史', difference: '差异点：李***为膝关节置换（刘***为髋关节置换）、李***术后康复较好（刘***术后康复较慢）、李***住院 7 天（刘***住院 10 天）', similarityRate: '60%（手术类型、术后用药有相似性，但康复进度有差异）' },
    { id: 'PTC-003', patientA: '王***（内分泌科住院患者，60 岁男性，2 型糖尿病 10 年病史）', patientB: '张***（内分泌科住院患者，58 岁男性，2 型糖尿病 8 年病史）', similarity: '相同点：均为中年男性、2 型糖尿病病史 8-10 年、长期服用二甲双胍、均有糖尿病肾病并发症', difference: '差异点：王***合并高血压（张***无高血压）、王***血糖控制不佳（张***血糖控制良好）、王***近期使用胰岛素（张***仅口服降糖药）', similarityRate: '65%（糖尿病病史、基础用药有相似性，但并发症控制有差异）' },
    { id: 'PTC-004', patientA: '刘***（呼吸内科住院患者，70 岁女性，慢阻肺 15 年病史）', patientB: '陈***（呼吸内科住院患者，68 岁女性，慢阻肺 12 年病史）', similarity: '相同点：均为老年女性、慢阻肺病史 12-15 年、长期使用吸入性激素 + 支气管扩张剂、均有急性加重史', difference: '差异点：刘***合并肺心病（陈***无肺心病）、刘***每年急性加重 3 次（陈***每年急性加重 2 次）、刘***住院 10 天（陈***住院 7 天）', similarityRate: '75%（慢阻肺病史、用药有高度相似性，但急性加重频率有差异）' },
    { id: 'PTC-005', patientA: '陈***（普外科住院患者，45 岁男性，急性阑尾炎术后）', patientB: '赵***（普外科住院患者，48 岁男性，急性胆囊炎术后）', similarity: '相同点：均为中年男性、均接受腹部急诊手术、术后均使用抗生素预防感染、术后均有发热史', difference: '差异点：陈***为阑尾炎手术（赵***为胆囊炎手术）、陈***术后恢复快（赵***术后恢复较慢）、陈***住院 5 天（赵***住院 7 天）', similarityRate: '55%（急诊手术、术后用药有相似性，但手术类型有差异）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-export - 时间线导出 5 条 */
async function handlePatientTimelineExport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTE-001', exportNo: 'EXPORT-2026-10-20-000001', patientName: '张***（心内科住院患者）', format: 'PDF 格式（含时间线图表、就诊记录汇总）', time: '2026-10-20 09:00:00（导出完成时间）', status: '已完成（文件大小：2.5 MB，可下载）' },
    { id: 'PTE-002', exportNo: 'EXPORT-2026-10-20-000002', patientName: '李***（骨科住院患者）', format: 'Excel 格式（含详细就诊记录、用药记录）', time: '2026-10-20 10:00:00（导出完成时间）', status: '已完成（文件大小：1.2 MB，可下载）' },
    { id: 'PTE-003', exportNo: 'EXPORT-2026-10-20-000003', patientName: '王***（内分泌科住院患者）', format: 'PDF 格式（含时间线图表、检验结果汇总）', time: '2026-10-20 11:00:00（导出完成时间）', status: '已完成（文件大小：3.0 MB，可下载）' },
    { id: 'PTE-004', exportNo: 'EXPORT-2026-10-20-000004', patientName: '刘***（呼吸内科住院患者）', format: 'Excel 格式（含详细就诊记录、用药记录）', time: '2026-10-20 14:00:00（导出完成时间）', status: '已完成（文件大小：1.8 MB，可下载）' },
    { id: 'PTE-005', exportNo: 'EXPORT-2026-10-20-000005', patientName: '陈***（普外科住院患者）', format: 'PDF 格式（含时间线图表、手术记录汇总）', time: '2026-10-20 15:00:00（导出完成时间）', status: '已完成（文件大小：1.5 MB，可下载）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m353Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/timeline-filter', handle: handlePatientTimelineFilter, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-summary', handle: handlePatientTimelineSummary, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-compare', handle: handlePatientTimelineCompare, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-export', handle: handlePatientTimelineExport, auth: true },
];
