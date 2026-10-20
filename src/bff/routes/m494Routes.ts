/**
 * 健澜科技 jlmedaios - M494 P0 合规：医疗质量安全 18 项核心制度看板后端
 *
 * 对接前端 web/src/services/api/coreSystemBoard.ts 调用的 3 个路径：
 *   /quality/core-systems     18 项核心制度落实率
 *   /quality/handover-round   三级查房 / 交接班
 *   /quality/consult-rate     会诊及时率
 * 避开 M492b /quality/readmission-*、M475 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/quality/core-systems - 18 项核心制度落实率（制度名/责任范围/落实率/督查次数）5 条 */
async function handleCoreSystems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CS-001', name: '制度名：首诊负责制度', dept: '责任范围：全院（2,860 份在架病历）', rate: '落实率：96.2%（督查覆盖 12 个临床科室）', inspections: '督查次数：12 次（本月联合督查）' },
    { id: 'CS-002', name: '制度名：三级查房制度', dept: '责任范围：全院（住院床位 1,860 张）', rate: '落实率：92.5%（主任医师/主治医师/住院医师三级查房到位率）', inspections: '督查次数：18 次（含夜查房 6 次）' },
    { id: 'CS-003', name: '制度名：值班和交接班制度', dept: '责任范围：全院（夜班在岗率 100%）', rate: '落实率：90.8%（床旁交接班执行率）', inspections: '督查次数：20 次（护理部联合督查）' },
    { id: 'CS-004', name: '制度名：疑难病例讨论制度', dept: '责任范围：医务处（全院疑难病例 MD T）', rate: '落实率：82.3%（部分科室讨论不及时）', inspections: '督查次数：6 次（抽查 24 份疑难病例）' },
    { id: 'CS-005', name: '制度名：术前讨论制度', dept: '责任范围：手术室/外科系统（月手术量 1,240 台）', rate: '落实率：97.2%（三/四级手术必讨论）', inspections: '督查次数：16 次（手术安全核查）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/handover-round - 三级查房与交接班（科室/主任/主治/住院医师查房率/交接班率）5 条 */
async function handleHandoverRound(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HR-001', dept: '科室：心血管内科（床位 52 张）', prof: '主任医师查房率：92.5%（每周 ≥2 次）', assoc: '主治医师查房率：96.8%（每日 1 次）', resident: '住院医师查房率：98.2%（每日 2 次）', handover: '交接班执行率：97.5%（床旁交接）' },
    { id: 'HR-002', dept: '科室：普外科（床位 64 张）', prof: '主任医师查房率：88.6%', assoc: '主治医师查房率：94.2%', resident: '住院医师查房率：97.0%', handover: '交接班执行率：95.8%' },
    { id: 'HR-003', dept: '科室：神经内科（床位 56 张）', prof: '主任医师查房率：90.1%', assoc: '主治医师查房率：95.5%', resident: '住院医师查房率：98.6%', handover: '交接班执行率：96.2%' },
    { id: 'HR-004', dept: '科室：急诊科（留观床位 32 张）', prof: '主任医师查房率：76.4%（夜班主任查房偏少）', assoc: '主治医师查房率：88.2%', resident: '住院医师查房率：95.0%', handover: '交接班执行率：93.6%' },
    { id: 'HR-005', dept: '科室：呼吸与危重症医学科（床位 48 张）', prof: '主任医师查房率：91.2%', assoc: '主治医师查房率：96.0%', resident: '住院医师查房率：98.0%', handover: '交接班执行率：97.0%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/consult-rate - 会诊及时率（类型/及时率/超时数/平均响应时长）5 条 */
async function handleConsultRate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CR-001', type: '类型：急会诊（≤10 分钟到位，月会诊量 86 次）', rate: '及时率：94.2%（81 次按时到位）', overdue: '超时数：3 次（含夜间/周末响应延迟）', avg: '平均响应时长：7.2 分钟' },
    { id: 'CR-002', type: '类型：普通会诊（≤24 小时完成，月会诊量 320 次）', rate: '及时率：91.5%（293 次按时完成）', overdue: '超时数：8 次', avg: '平均响应时长：14.6 小时' },
    { id: 'CR-003', type: '类型：全院会诊（≤48 小时完成，月会诊量 48 次）', rate: '及时率：96.8%（46 次按时完成）', overdue: '超时数：1 次', avg: '平均响应时长：32.4 小时' },
    { id: 'CR-004', type: '类型：多学科 MDT 会诊（按需召集，月 24 次）', rate: '及时率：100.0%（24 次均按期召开）', overdue: '超时数：0 次', avg: '平均响应时长：5.6 天（提前预约）' },
    { id: 'CR-005', type: '类型：院际远程会诊（≤72 小时，月 12 次）', rate: '及时率：100.0%（12 次均按期完成）', overdue: '超时数：0 次', avg: '平均响应时长：2.4 天' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m494Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/quality/core-systems', handle: handleCoreSystems, auth: true },
  { method: 'GET', path: '/api/v1/quality/handover-round', handle: handleHandoverRound, auth: true },
  { method: 'GET', path: '/api/v1/quality/consult-rate', handle: handleConsultRate, auth: true },
];
