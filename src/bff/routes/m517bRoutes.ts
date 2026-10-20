/**
 * 健澜科技 jlmedaios - M517b P0 合规重点（医疗质量安全·麻醉深度新方向）：ASA 分级+术中安全+术后随访 2 端点缺口
 *
 * anesthesia/grading 已 200（已有确认不重建）；本批补建 anesthesia/intraop 术中安全、anesthesia/followup 术后随访。
 * 与 M517 /anesthesia/grading|intraop-events|analgesia 区分（intraop 与 intraop-events 不同路径）；
 * 与 M490 /operation/day-surgery、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/anesthesia/intraop - 术中安全（手术名称/麻醉医师/术中事件Tag/安全核查完成）5 条 */
async function handleAnesthesiaIntraop(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AI-001', surgery: '手术名称：腹腔镜胆囊切除术（LC）', doctor: '麻醉医师：王医师（主治医师，工号 A201）', event: '术中事件Tag：低血压黄（收缩压 85mmHg，麻黄碱处理后回升）', safety: '安全核查完成绿（三方核查：麻醉前/切皮前/离室前 3 次均完成）' },
    { id: 'AI-002', surgery: '手术名称：全髋关节置换术（THA）', doctor: '麻醉医师：李医师（副主任医师，工号 A105）', event: '术中事件Tag：低氧血症橙（SpO₂ 88%，调整导管后回升）', safety: '安全核查完成绿（3 次核查均完成）' },
    { id: 'AI-003', surgery: '手术名称：食管癌根治术', doctor: '麻醉医师：张教授（主任医师，工号 A002）', event: '术中事件Tag：心律失常红（频发室早，利多卡因处理后消失）', safety: '安全核查完成绿（3 次核查均完成）' },
    { id: 'AI-004', surgery: '手术名称：冠状动脉旁路移植术（CABG）', doctor: '麻醉医师：刘教授（主任医师，工号 A001）', event: '术中事件Tag：输血紫（术中出血 800ml，输注红细胞 4U + 血浆 400ml）', safety: '安全核查完成绿（3 次核查均完成）' },
    { id: 'AI-005', surgery: '手术名称：急诊脾破裂修补术', doctor: '麻醉医师：陈医师（主治医师，工号 A208）', event: '术中事件Tag：低血压黄（失血性休克，快速输液+输血后稳定）', safety: '安全核查完成绿（急诊手术 3 次核查均完成，耗时较短）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/followup - 术后随访（患者/疼痛评分Tag/恶心呕吐Tag/随访完成率）5 条 */
async function handleAnesthesiaFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AF-001', patient: '患者：张**（男，58 岁，LC 术后 24h）', pain: '疼痛评分Tag：0-3绿（VAS 2.0 分，静息时无痛）', nausea: '恶心呕吐Tag：无（未发生PONV）', rate: '随访完成率Tag：≥90%绿（术后24h内随访完成率 96%）' },
    { id: 'AF-002', patient: '患者：李**（女，66 岁，THA 术后 24h）', pain: '疼痛评分Tag：4-6橙（VAS 5.0 分，活动时疼痛明显）', nausea: '恶心呕吐Tag：轻度（呕吐 1 次，昂丹司琼处理后缓解）', rate: '随访完成率Tag：≥90%绿（95%）' },
    { id: 'AF-003', patient: '患者：王**（男，62 岁，食管癌术后 48h）', pain: '疼痛评分Tag：4-6橙（VAS 5.5 分，咳嗽时疼痛明显）', nausea: '恶心呕吐Tag：中度（呕吐 3 次，需追加止吐药）', rate: '随访完成率Tag：≥90%绿（94%）' },
    { id: 'AF-004', patient: '患者：赵**（男，70 岁，CABG 术后 48h）', pain: '疼痛评分Tag：0-3绿（VAS 2.5 分，ICU 镇痛充分）', nausea: '恶心呕吐Tag：无（未发生PONV）', rate: '随访完成率Tag：≥90%绿（98%，ICU 患者随访率最高）' },
    { id: 'AF-005', patient: '患者：孙**（女，35 岁，急诊脾修补术后 24h）', pain: '疼痛评分Tag：7-10红（VAS 7.5 分，疼痛剧烈，需追加镇痛药）', nausea: '恶心呕吐Tag：轻度（呕吐 1 次）', rate: '随访完成率Tag：70-90%橙（88%，急诊患者随访率偏低）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m517bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/intraop', handle: handleAnesthesiaIntraop, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/followup', handle: handleAnesthesiaFollowup, auth: true },
];
