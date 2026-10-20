/**
 * 健澜科技 jlmedaios - M319（新）患者时间线补建 + 护理 NQI 域
 *
 * 补建患者时间线 + 时间线详情 + 护理 NQI 总览/明细/对比/趋势
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/timeline - 患者时间线 5 条（补创建） */
async function handlePatientTimeline(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PT-001', patient: '王***（男，65 岁）', event: '急诊入院（胸痛 3 小时）', time: '2026-10-20 08:00', department: '心内科（急诊）', status: '住院中（术后第 1 天）' },
    { id: 'PT-002', patient: '李***（女，58 岁）', event: '门诊就诊（咳嗽咳痰 5 天）', time: '2026-10-19 10:00', department: '呼吸内科（门诊）', status: '已开药，居家治疗' },
    { id: 'PT-003', patient: '张***（男，72 岁）', event: '门诊就诊（多饮多尿 3 个月）', time: '2026-10-18 14:00', department: '内分泌科（门诊）', status: '已确诊 2 型糖尿病，开始药物治疗' },
    { id: 'PT-004', patient: '赵***（女，45 岁）', event: '急诊入院（腹痛 6 小时）', time: '2026-10-18 09:00', department: '普外科（急诊）', status: '住院中（术前抗感染第 1 天）' },
    { id: 'PT-005', patient: '孙***（男，68 岁）', event: '急诊入院（右侧肢体无力 2 小时）', time: '2026-10-17 08:30', department: '神经内科（急诊）', status: '住院中（溶栓后第 3 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-detail - 时间线详情 5 条 */
async function handlePatientTimelineDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTD-001', patient: '王***', event: '急诊入院', detail: '心电图 V1-V4 ST 段抬高 0.3mV，CK-MB 45 ng/ml，诊断急性前壁心肌梗死，急诊 PCI（左前降支植入支架 1 枚）', doctor: '心内科 李***主任医师', time: '2026-10-20 08:00-12:00' },
    { id: 'PTD-002', patient: '李***', event: '门诊就诊', detail: '体温 38.5℃，右肺中野湿啰音，胸片提示右肺中野斑片影，诊断社区获得性肺炎，开具头孢呋辛 0.5g bid', doctor: '呼吸内科 王***副主任医师', time: '2026-10-19 10:00-10:30' },
    { id: 'PTD-003', patient: '张***', event: '门诊就诊', detail: '空腹血糖 9.8 mmol/L，HbA1c 8.5%，诊断 2 型糖尿病，开具二甲双胍 0.5g bid + 饮食指导 + 运动处方', doctor: '内分泌科 张***主治医师', time: '2026-10-18 14:00-14:45' },
    { id: 'PTD-004', patient: '赵***', event: '急诊入院', detail: '右上腹压痛，Murphy 征阳性，白细胞 12×10⁹/L，超声提示胆囊增大壁增厚，诊断急性胆囊炎，禁食+抗感染', doctor: '普外科 郑***主任医师', time: '2026-10-18 09:00-10:00' },
    { id: 'PTD-005', patient: '孙***', event: '急诊入院', detail: '右侧肢体无力，NIHSS 评分 8 分，头颅 CT 排除出血，诊断急性脑梗死（左侧基底节区），rt-PA 静脉溶栓', doctor: '神经内科 刘***副主任医师', time: '2026-10-17 08:30-10:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-overview - 护理 NQI 总览 5 条 */
async function handleNursingNqiOverview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNO-001', indicator: '护理不良事件发生率', target: '≤0.5‰', actual: '0.32‰', rate: '达标（64%）', trend: '↓ 较上月下降 0.08‰' },
    { id: 'NNO-002', indicator: '压疮发生率（院内获得性）', target: '≤0.2‰', actual: '0.15‰', rate: '达标（75%）', trend: '→ 与上月持平' },
    { id: 'NNO-003', indicator: '跌倒发生率', target: '≤0.3‰', actual: '0.28‰', rate: '达标（93%）', trend: '↑ 较上月上升 0.05‰' },
    { id: 'NNO-004', indicator: '导管相关感染率（CLABSI）', target: '≤1.0‰', actual: '0.65‰', rate: '达标（65%）', trend: '↓ 较上月下降 0.2‰' },
    { id: 'NNO-005', indicator: '护士患者满意度', target: '≥95%', actual: '96.2%', rate: '达标（101%）', trend: '↑ 较上月上升 1.2%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-detail - 护理 NQI 明细 5 条 */
async function handleNursingNqiDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NND-001', indicator: '护理不良事件发生率', department: '心内科病区', value: '0.45‰', rank: '全院第 3 位', time: '2026 年 9 月' },
    { id: 'NND-002', indicator: '压疮发生率（院内获得性）', department: '神经内科病区', value: '0.35‰', rank: '全院第 1 位（最高）', time: '2026 年 9 月' },
    { id: 'NND-003', indicator: '跌倒发生率', department: '老年医学科病区', value: '0.55‰', rank: '全院第 1 位（最高）', time: '2026 年 9 月' },
    { id: 'NND-004', indicator: '导管相关感染率（CLABSI）', department: 'ICU', value: '1.20‰', rank: '全院第 1 位（最高）', time: '2026 年 9 月' },
    { id: 'NND-005', indicator: '护士患者满意度', department: '普外科病区', value: '97.8%', rank: '全院第 1 位（最高）', time: '2026 年 9 月' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-comparison - 护理 NQI 对比 5 条 */
async function handleNursingNqiComparison(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNC-001', indicator: '护理不良事件发生率', ours: '0.32‰', peer: '同级医院平均 0.45‰', diff: '优于同级医院 29%', evaluation: '优秀' },
    { id: 'NNC-002', indicator: '压疮发生率（院内获得性）', ours: '0.15‰', peer: '同级医院平均 0.25‰', diff: '优于同级医院 40%', evaluation: '优秀' },
    { id: 'NNC-003', indicator: '跌倒发生率', ours: '0.28‰', peer: '同级医院平均 0.30‰', diff: '优于同级医院 7%', evaluation: '良好' },
    { id: 'NNC-004', indicator: '导管相关感染率（CLABSI）', ours: '0.65‰', peer: '同级医院平均 0.80‰', diff: '优于同级医院 19%', evaluation: '良好' },
    { id: 'NNC-005', indicator: '护士患者满意度', ours: '96.2%', peer: '同级医院平均 93.5%', diff: '优于同级医院 2.7%', evaluation: '优秀' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-trend - 护理 NQI 趋势 5 条 */
async function handleNursingNqiTrend(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNT-001', indicator: '护理不良事件发生率', month: '2026 年 1-9 月', value: '1 月 0.55‰ → 9 月 0.32‰', target: '≤0.5‰', change: '↓ 持续下降，改善趋势明显' },
    { id: 'NNT-002', indicator: '压疮发生率（院内获得性）', month: '2026 年 1-9 月', value: '1 月 0.30‰ → 9 月 0.15‰', target: '≤0.2‰', change: '↓ 持续下降，已达标' },
    { id: 'NNT-003', indicator: '跌倒发生率', month: '2026 年 1-9 月', value: '1 月 0.25‰ → 9 月 0.28‰', target: '≤0.3‰', change: '↑ 略有上升，需关注老年病区' },
    { id: 'NNT-004', indicator: '导管相关感染率（CLABSI）', month: '2026 年 1-9 月', value: '1 月 1.00‰ → 9 月 0.65‰', target: '≤1.0‰', change: '↓ 持续下降，已达标' },
    { id: 'NNT-005', indicator: '护士患者满意度', month: '2026 年 1-9 月', value: '1 月 92.5% → 9 月 96.2%', target: '≥95%', change: '↑ 持续上升，已达标' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m319NewRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/timeline', handle: handlePatientTimeline, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-detail', handle: handlePatientTimelineDetail, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-overview', handle: handleNursingNqiOverview, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-detail', handle: handleNursingNqiDetail, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-comparison', handle: handleNursingNqiComparison, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-trend', handle: handleNursingNqiTrend, auth: true },
];
