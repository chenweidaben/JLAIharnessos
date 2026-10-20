/**
 * 健澜科技 jlmedaios - M483b P0 合规：人力资源与绩效管理（花名册 / 培训记录 / 离职率）
 *
 * 人员花名册 / 培训记录 / 离职率
 * （hr/attendance、hr/performance、hr/recruitment 已存在，不重复建）。
 * 避开 M458 hr 既有（staff-profile/attendance/schedules/training-credits/promotion/payroll）、M469 performance/score·piecework、M8 用户/角色、M471-M483 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/hr/staff-roster - 人员花名册（科室/在编人数/合同人数/返聘人数/规培人数）5 条 */
async function handleStaffRoster(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSR-001', dept: '科室：全院人员花名册汇总', wf: '在编人数：862 人（事业编制）', contract: '合同人数：486 人（合同制/派遣）', rehire: '返聘人数：18 人（退休返聘专家）', resident: '规培人数：56 人（在培住培/专培）' },
    { id: 'HSR-002', dept: '科室：临床医师（内科/外科/妇产/儿科）', wf: '在编人数：320 人', contract: '合同人数：86 人', rehire: '返聘人数：10 人', resident: '规培人数：42 人' },
    { id: 'HSR-003', dept: '科室：护理队伍', wf: '在编人数：340 人', contract: '合同人数：280 人', rehire: '返聘人数：3 人（护理督导）', resident: '规培人数：—（护理无规培编制）' },
    { id: 'HSR-004', dept: '科室：医技（检验/影像/药剂/病理）', wf: '在编人数：120 人', contract: '合同人数：62 人', rehire: '返聘人数：4 人', resident: '规培人数：10 人' },
    { id: 'HSR-005', dept: '科室：行政后勤（含信息/财务/人事）', wf: '在编人数：82 人', contract: '合同人数：58 人', rehire: '返聘人数：1 人', resident: '规培人数：4 人（行政轮转）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/training-record - 培训记录（科室/院内培训次数/外出进修人数/继教学分完成率）5 条 */
async function handleTrainingRecord(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HTR-001', dept: '科室：全院培训记录汇总', inHouse: '院内培训次数：本月 24 场（三基/感控/医保/信息安全）', external: '外出进修人数：12 人（上级医院进修）', credits: '继教学分完成率：人均 22.5 分（达标率 96%）' },
    { id: 'HTR-002', dept: '科室：临床医师', inHouse: '院内培训次数：本月 14 场（临床指南/病历规范）', external: '外出进修人数：8 人（介入/内镜方向）', credits: '继教学分完成率：人均 24 分（达标率 98%）' },
    { id: 'HTR-003', dept: '科室：护理队伍', inHouse: '院内培训次数：本月 8 场（急救技能/分级护理）', external: '外出进修人数：3 人（专科护士方向）', credits: '继教学分完成率：人均 20 分（达标率 95%）' },
    { id: 'HTR-004', dept: '科室：医技（检验/影像/药剂）', inHouse: '院内培训次数：本月 5 场（室间质评/设备操作）', external: '外出进修人数：2 人', credits: '继教学分完成率：人均 21 分（达标率 94%）' },
    { id: 'HTR-005', dept: '科室：行政后勤', inHouse: '院内培训次数：本月 3 场（信息安全/医保政策）', external: '外出进修人数：1 人', credits: '继教学分完成率：人均 15 分（达标率 88%，需督导）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/turnover - 离职率（科室/月度离职率/关键岗位流失数/流失率/同比）5 条 */
async function handleTurnover(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HTO-001', dept: '科室：全院离职率汇总（本月）', monthlyRate: '月度离职率：1.2%（同比下降 0.4pct）', keyLoss: '关键岗位流失数：3 人（1 名骨干医师/2 名专科护士）', lossRate: '关键岗位流失率：0.6%（处于警戒线下）', yoy: '同比：-0.4pct（留人措施见效）' },
    { id: 'HTO-002', dept: '科室：临床医师', monthlyRate: '月度离职率：0.9%', keyLoss: '关键岗位流失数：1 人（骨干医师离职民营）', lossRate: '流失率：0.8%', yoy: '同比：-0.2pct' },
    { id: 'HTO-003', dept: '科室：护理队伍', monthlyRate: '月度离职率：1.8%（行业普遍偏高）', keyLoss: '关键岗位流失数：2 人（专科护士）', lossRate: '流失率：1.2%（已启动留人面谈）', yoy: '同比：-0.6pct' },
    { id: 'HTO-004', dept: '科室：医技', monthlyRate: '月度离职率：0.6%', keyLoss: '关键岗位流失数：0 人', lossRate: '流失率：0%', yoy: '同比：持平' },
    { id: 'HTO-005', dept: '科室：行政后勤', monthlyRate: '月度离职率：0.5%', keyLoss: '关键岗位流失数：0 人', lossRate: '流失率：0%', yoy: '同比：-0.1pct' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m483bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/staff-roster', handle: handleStaffRoster, auth: true },
  { method: 'GET', path: '/api/v1/hr/training-record', handle: handleTrainingRecord, auth: true },
  { method: 'GET', path: '/api/v1/hr/turnover', handle: handleTurnover, auth: true },
];
