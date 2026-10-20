/**
 * 健澜科技 jlmedaios - M495 P0 合规：日间手术管理看板后端
 *
 * 对接前端 web/src/services/api/daySurgeryBoard.ts 调用的 3 个路径：
 *   /day-surgery/list         今日日间手术列表
 *   /day-surgery/quality       日间手术质量指标
 *   /day-surgery/readmission  非计划再入院记录
 * 避开 M476 /surgery/*·/anesthesia/*、M494 /quality/*、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/day-surgery/list - 今日日间手术列表（患者/手术名/科室/主刀/起止时间/状态）5 条 */
async function handleDaySurgeryList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DSL-001', patient: '患者：张**（女，52 岁，住院号 20261020001）', operation: '手术名：腹腔镜胆囊切除术（LC）', dept: '科室：普外科', surgeon: '主刀医师：王教授（主任医师）', time: '起止时间：08:30 - 09:45', status: '状态：已完成（done）' },
    { id: 'DSL-002', patient: '患者：李**（男，68 岁，住院号 20261020002）', operation: '手术名：白内障超声乳化 + 人工晶体植入', dept: '科室：眼科', surgeon: '主刀医师：李教授（主任医师）', time: '起止时间：09:00 - 09:30', status: '状态：已完成（done）' },
    { id: 'DSL-003', patient: '患者：王**（女，38 岁，住院号 20261020003）', operation: '手术名：宫腔镜息肉切除术', dept: '科室：妇产科', surgeon: '主刀医师：赵教授（副主任医师）', time: '起止时间：10:00 - 10:40', status: '状态：进行中（ongoing）' },
    { id: 'DSL-004', patient: '患者：赵**（男，45 岁，住院号 20261020004）', operation: '手术名：腹股沟疝修补术（无张力）', dept: '科室：普外科', surgeon: '主刀医师：陈教授（副主任医师）', time: '起止时间：13:30 - 14:30', status: '状态：已排程（scheduled）' },
    { id: 'DSL-005', patient: '患者：孙**（男，56 岁，住院号 20261020005）', operation: '手术名：输尿管镜碎石取石术（URL）', dept: '科室：泌尿外科', surgeon: '主刀医师：周教授（副主任医师）', time: '起止时间：14:00 - 15:00', status: '状态：已排程（scheduled）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/day-surgery/quality - 日间手术质量指标（指标名/本期值/目标值/达成率）5 条 */
async function handleDaySurgeryQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DSQ-001', name: '指标：日间手术占择期手术比例', current: '本期值：28.5%（月日间手术 286 例/择期 1,004 例）', target: '目标值：20.0%（国家三级医院评审建议）', rate: '达成率：142.5%（超额达标）' },
    { id: 'DSQ-002', name: '指标：术后 24 小时出院率', current: '本期值：96.2%（275/286 例 24h 内出院）', target: '目标值：95.0%', rate: '达成率：101.3%（达标）' },
    { id: 'DSQ-003', name: '指标：非计划再入院率', current: '本期值：1.8%（5/286 例 30 天内非计划再入院）', target: '目标值：≤1.0%（红线）', rate: '达成率：55.6%（未达标，需重点改善）' },
    { id: 'DSQ-004', name: '指标：非计划中转住院率', current: '本期值：3.2%（9/286 例术中/术后中转住院）', target: '目标值：≤5.0%', rate: '达成率：156.3%（达标）' },
    { id: 'DSQ-005', name: '指标：术后并发症率', current: '本期值：0.8%（2/286 例出现术后并发症）', target: '目标值：≤1.5%', rate: '达成率：187.5%（优于目标）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/day-surgery/readmission - 非计划再入院记录（患者/手术/原因/距手术天数/责任判定）5 条 */
async function handleDaySurgeryReadmission(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DSR-001', patient: '患者：钱**（腹腔镜胆囊切除术后）', operation: '手术：腹腔镜胆囊切除术（2026-10-15）', reason: '再入院原因：术后胆漏伴腹痛', days: '距手术天数：2 天', liability: '责任判定：related（手术相关，需讨论改进）' },
    { id: 'DSR-002', patient: '患者：吴**（白内障超声乳化术后）', operation: '手术：白内障超声乳化（2026-10-12）', reason: '再入院原因：急性心梗（与手术无关）', days: '距手术天数：3 天', liability: '责任判定：unrelated（手术无关，基础疾病急性发作）' },
    { id: 'DSR-003', patient: '患者：郑**（宫腔镜息肉切除术后）', operation: '手术：宫腔镜息肉切除术（2026-10-10）', reason: '再入院原因：发热待查（感染待排查）', days: '距手术天数：5 天', liability: '责任判定：under_review（待讨论，初步判断非手术直接导致）' },
    { id: 'DSR-004', patient: '患者：冯**（腹股沟疝修补术后）', operation: '手术：腹股沟疝修补术（2026-10-08）', reason: '再入院原因：切口感染', days: '距手术天数：7 天', liability: '责任判定：related（切口感染，与手术操作相关）' },
    { id: 'DSR-005', patient: '患者：陈**（输尿管镜碎石术后）', operation: '手术：输尿管镜碎石取石术（2026-10-05）', reason: '再入院原因：肾绞痛复发（残余结石）', days: '距手术天数：9 天', liability: '责任判定：related（残余结石，需二次碎石）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m495Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/day-surgery/list', handle: handleDaySurgeryList, auth: true },
  { method: 'GET', path: '/api/v1/day-surgery/quality', handle: handleDaySurgeryQuality, auth: true },
  { method: 'GET', path: '/api/v1/day-surgery/readmission', handle: handleDaySurgeryReadmission, auth: true },
];
