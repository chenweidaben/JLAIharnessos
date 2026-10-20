/**
 * 健澜科技 jlmedaios - M517 P0 合规重点（医疗质量安全·麻醉深度）：手术麻醉深度监控 3 端点
 *
 * anesthesia/grading 麻醉分级、anesthesia/intraop-events 术中事件、anesthesia/analgesia 术后镇痛。
 * 与 M492 /operation/anesthesia 概览区分（走 anesthesia/ 新前缀）；与 M516 /disease/*、M515 /safety/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/anesthesia/grading - 麻醉分级（分级Tag/科室/麻醉医师）5 条 */
async function handleAnesthesiaGrading(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AG-001', grade: '分级Tag：Ⅰ级绿（体格健康，发育营养良好，各器官功能正常，如胆囊切除）', dept: '手术科室：普外科', doctor: '麻醉医师：王医师（主治医师，工号 A201）' },
    { id: 'AG-002', grade: '分级Tag：Ⅱ级蓝（除外科疾病外，有轻度并存病，功能代偿健全，如高血压控制良好）', dept: '手术科室：骨科', doctor: '麻醉医师：李医师（副主任医师，工号 A105）' },
    { id: 'AG-003', grade: '分级Tag：Ⅲ级橙（并存病情严重，体力活动受限，但尚能日常活动，如冠心病稳定型）', dept: '手术科室：胸外科', doctor: '麻醉医师：张教授（主任医师，工号 A002）' },
    { id: 'AG-004', grade: '分级Tag：Ⅳ级红（并存病严重，丧失日常活动能力，经常面临生命威胁，如心梗急性期）', dept: '手术科室：心外科', doctor: '麻醉医师：刘教授（主任医师，工号 A001）' },
    { id: 'AG-005', grade: '分级Tag：Ⅴ级紫（无论手术与否，难以活命 24h 以内的濒死患者，如大动脉破裂）', dept: '手术科室：急诊创伤外科', doctor: '麻醉医师：陈医师（主治医师，工号 A208）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/intraop-events - 术中事件（类型Tag/时间/处理措施）5 条 */
async function handleAnesthesiaIntraopEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AIE-001', type: '事件类型Tag：低血压黄（收缩压 <80mmHg，持续 5min）', time: '发生时间：2026-10-20 10:30（全麻诱导后 10min）', action: '处理措施：加快输液 + 麻黄碱 10mg iv，3min 后血压回升至 110/70mmHg' },
    { id: 'AIE-002', type: '事件类型Tag：高血压橙（收缩压 >180mmHg，持续 5min）', time: '发生时间：2026-10-19 14:00（手术牵拉时）', action: '处理措施：加深麻醉 + 尼卡地平 0.5mg iv，5min 后血压降至 150/90mmHg' },
    { id: 'AIE-003', type: '事件类型Tag：低氧血症红（SpO₂ <90%，持续 3min）', time: '发生时间：2026-10-18 09:30（气管插管后）', action: '处理措施：检查气道 + 调整导管深度 + 纯氧通气，2min 后 SpO₂ 升至 98%' },
    { id: 'AIE-004', type: '事件类型Tag：心律失常紫（频发室早，>5 次/min）', time: '发生时间：2026-10-17 11:00（手术中）', action: '处理措施：检查电解质 + 利多卡因 50mg iv，3min 后室早消失' },
    { id: 'AIE-005', type: '事件类型Tag：过敏反应蓝（皮疹 + 血压下降）', time: '发生时间：2026-10-16 15:00（输注抗生素后）', action: '处理措施：立即停药 + 肾上腺素 0.1mg iv + 激素 + 补液，10min 后生命体征稳定' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/analgesia - 术后镇痛（镇痛方式Tag/满意度Tag/VAS评分）5 条 */
async function handleAnesthesiaAnalgesia(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AA-001', method: '镇痛方式Tag：PCIA 患者自控蓝（静脉患者自控镇痛，芬太尼 + 昂丹司琼）', satisfaction: '镇痛满意度Tag：≥90%绿（95%，VAS 评分 2.5 分）', vas: 'VAS 评分：2.5 分（术后 24h 静息时）' },
    { id: 'AA-002', method: '镇痛方式Tag：硬膜外橙（硬膜外自控镇痛，罗哌卡因 + 芬太尼）', satisfaction: '镇痛满意度Tag：≥90%绿（92%，VAS 评分 2.0 分）', vas: 'VAS 评分：2.0 分（术后 24h 静息时）' },
    { id: 'AA-003', method: '镇痛方式Tag：神经阻滞绿（椎旁神经阻滞，罗哌卡因）', satisfaction: '镇痛满意度Tag：70-90%橙（85%，VAS 评分 3.5 分）', vas: 'VAS 评分：3.5 分（术后 24h 静息时，需追加口服止痛药）' },
    { id: 'AA-004', method: '镇痛方式Tag：静脉紫（静脉单次给药，帕瑞昔布 + 羟考酮）', satisfaction: '镇痛满意度Tag：70-90%橙（82%，VAS 评分 4.0 分）', vas: 'VAS 评分：4.0 分（术后 24h 静息时，活动时 6.0 分）' },
    { id: 'AA-005', method: '镇痛方式Tag：PCIA 患者自控蓝（静脉患者自控镇痛，舒芬太尼 + 右美托咪定）', satisfaction: '镇痛满意度Tag：≥90%绿（96%，VAS 评分 1.8 分）', vas: 'VAS 评分：1.8 分（术后 24h 静息时，活动时 3.2 分）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m517Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/grading', handle: handleAnesthesiaGrading, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/intraop-events', handle: handleAnesthesiaIntraopEvents, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/analgesia', handle: handleAnesthesiaAnalgesia, auth: true },
];
