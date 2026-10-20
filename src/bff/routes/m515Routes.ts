/**
 * 健澜科技 jlmedaios - M515 P0 合规重点（医疗质量安全·患者安全深度）：患者安全事件与 RCA 根因分析 3 端点
 *
 * safety/events 患者安全事件、safety/rca RCA 根因分析、safety/rectification 整改追踪。
 * 与 M479 /safety 概览区分（走 safety/ 新前缀）；与 M514 /infection/*、M513 /insurance/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/safety/events - 患者安全事件（类型Tag/严重程度Tag/科室/上报时间）5 条 */
async function handleSafetyEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SE-001', type: '事件类型Tag：跌倒橙（老年患者夜间如厕跌倒）', severity: '严重程度Tag：Ⅱ级不良事件橙（擦伤，无骨折）', dept: '发生科室：老年医学科', time: '上报时间：2026-10-19 23:30（夜班护士 30min 内上报）' },
    { id: 'SE-002', type: '事件类型Tag：压疮红（骶尾部 III 期压疮，住院 14 天发现）', severity: '严重程度Tag：Ⅲ级后果事件红（III 期，需换药+营养支持）', dept: '发生科室：神经内科（昏迷卧床）', time: '上报时间：2026-10-18 09:15（晨间护理发现后立即上报）' },
    { id: 'SE-003', type: '事件类型Tag：用药错误紫（医嘱开立剂量错误，护士核对时发现未执行）', severity: '严重程度Tag：Ⅰ级隐患黄（未造成实际伤害）', dept: '发生科室：普外科', time: '上报时间：2026-10-17 10:00（药师审方拦截）' },
    { id: 'SE-004', type: '事件类型Tag：管路滑脱蓝（胃管非计划脱出，患者躁动自行拔管）', severity: '严重程度Tag：Ⅱ级不良事件橙（需重置胃管，无误吸）', dept: '发生科室：消化内科', time: '上报时间：2026-10-16 03:45（夜班巡视发现）' },
    { id: 'SE-005', type: '事件类型Tag：跌倒坠床绿（坠床致右髋部骨折，二次手术）', severity: '严重程度Tag：Ⅳ级警讯事件深红（需上报卫健委）', dept: '发生科室：骨科', time: '上报时间：2026-10-15 02:45（立即上报科主任+护理部）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/safety/rca - RCA 根因分析（事件编号/分析状态Tag/根本原因类别Tag/整改措施数）5 条 */
async function handleSafetyRca(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SR-001', event: '事件编号：SE-20261019001（老年科跌倒事件）', status: '分析状态Tag：待分析蓝（需 72h 内启动 RCA）', cause: '根本原因类别Tag：环红（夜间卫生间地面湿滑，照明不足）', actions: '整改措施数：待制定（目标 5 条）' },
    { id: 'SR-002', event: '事件编号：SE-20261018001（神内压疮事件）', status: '分析状态Tag：分析中橙（已启动 RCA，小组讨论中）', cause: '根本原因类别Tag：人蓝（护士翻身执行率仅 85%，未按 q2h 执行）', actions: '整改措施数：已制定 3 条，待补充至 5 条' },
    { id: 'SR-003', event: '事件编号：SE-20261017001（普外科用药错误事件）', status: '分析状态Tag：已完成绿（RCA 报告已归档）', cause: '根本原因类别Tag：法紫（医嘱开立系统无剂量上限校验，依赖人工核对）', actions: '整改措施数：已制定 5 条（含系统校验+流程优化）' },
    { id: 'SR-004', event: '事件编号：SE-20261016001（消化内管路滑脱事件）', status: '分析状态Tag：分析中橙（已启动 RCA）', cause: '根本原因类别Tag：人蓝（约束评估不到位，未及时调整约束方式）', actions: '整改措施数：已制定 2 条，待补充' },
    { id: 'SR-005', event: '事件编号：SE-20261015001（骨科坠床致骨折警讯事件）', status: '分析状态Tag：已完成绿（RCA 报告已上报卫健委）', cause: '根本原因类别Tag：机橙（床栏锁扣故障，未及时发现）', actions: '整改措施数：已制定 8 条（含全院床栏排查+流程优化）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/safety/rectification - 整改追踪（整改措施/责任科室/完成时限Tag/完成率Tag）5 条 */
async function handleSafetyRectification(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRe-001', measure: '整改措施：夜间卫生间加装扶手+防滑垫+感应照明', dept: '责任科室：后勤/老年医学科', deadline: '完成时限Tag：进行中蓝（目标 2026-10-31 完成）', rate: '完成率Tag：85-95% 橙（已采购物资，待安装）' },
    { id: 'SRe-002', measure: '整改措施：卧床患者 q2h 翻身执行率纳入护士长考核', dept: '责任科室：护理部/神内', deadline: '完成时限Tag：进行中蓝（目标 2026-10-25 落地）', rate: '完成率Tag：≥95% 绿（已制定考核标准，试运行中）' },
    { id: 'SRe-003', measure: '整改措施：医嘱开立系统增加剂量上限校验（超量弹窗）', dept: '责任科室：信息科/药学部', deadline: '完成时限Tag：已完成绿（2026-10-20 已上线）', rate: '完成率Tag：≥95% 绿（已完成，覆盖所有科室）' },
    { id: 'SRe-004', measure: '整改措施：约束患者每 2h 评估记录纳入护理文书', dept: '责任科室：护理部/精神科', deadline: '完成时限Tag：已逾期红（目标 2026-10-15，未完成）', rate: '完成率Tag：<85% 红（仅精神科试运行，未全院推广）' },
    { id: 'SRe-005', measure: '整改措施：全院床栏锁扣排查+更换故障床栏', dept: '责任科室：后勤/骨科', deadline: '完成时限Tag：已完成绿（2026-10-18 已完成）', rate: '完成率Tag：≥95% 绿（已排查 1,200 张床，更换 12 张故障床栏）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m515Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/safety/events', handle: handleSafetyEvents, auth: true },
  { method: 'GET', path: '/api/v1/safety/rca', handle: handleSafetyRca, auth: true },
  { method: 'GET', path: '/api/v1/safety/rectification', handle: handleSafetyRectification, auth: true },
];
