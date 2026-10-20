/**
 * 健澜科技 jlmedaios - M490 P0 合规：医技工作量（检验/影像/病理汇总）+ 党建纪检工会
 *
 * 医技 workload 走汇总口径，与 M439·M440·M441 既有明细端点区分。
 * 避开 M439·M440·M441·M487·M488·M488b 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/lab/workload - 检验工作量（日期/今日标本数/异常数/及时率/报告数）5 条 */
async function handleLabWorkload(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LW-001', date: '日期：2026-10-20（周一）', specimens: '今日标本数：2,860 份', abnormal: '异常数：342 份（12.0%）', timely: '及时率：98.6%（≤2 小时出报告）', reports: '报告数：2,840 份（已审核）' },
    { id: 'LW-002', date: '日期：2026-10-19', specimens: '今日标本数：2,720 份', abnormal: '异常数：310 份', timely: '及时率：98.2%', reports: '报告数：2,698 份' },
    { id: 'LW-003', date: '日期：2026-10-18', specimens: '今日标本数：2,480 份', abnormal: '异常数：285 份', timely: '及时率：97.8%', reports: '报告数：2,462 份' },
    { id: 'LW-004', date: '日期：2026-10-17', specimens: '今日标本数：2,610 份', abnormal: '异常数：302 份', timely: '及时率：98.0%', reports: '报告数：2,590 份' },
    { id: 'LW-005', date: '日期：2026-10-16', specimens: '今日标本数：2,540 份', abnormal: '异常数：290 份', timely: '及时率：97.6%', reports: '报告数：2,520 份' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/workload - 影像工作量（日期/CT/MR/DR/超声数）5 条 */
async function handleRadiologyWorkload(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RW-001', date: '日期：2026-10-20（周一）', ct: 'CT 检查数：186 例', mr: 'MR 检查数：62 例', dr: 'DR 检查数：420 例', us: '超声检查数：380 例' },
    { id: 'RW-002', date: '日期：2026-10-19', ct: 'CT 检查数：172 例', mr: 'MR 检查数：58 例', dr: 'DR 检查数：402 例', us: '超声检查数：365 例' },
    { id: 'RW-003', date: '日期：2026-10-18', ct: 'CT 检查数：148 例', mr: 'MR 检查数：52 例', dr: 'DR 检查数：358 例', us: '超声检查数：320 例' },
    { id: 'RW-004', date: '日期：2026-10-17', ct: 'CT 检查数：165 例', mr: 'MR 检查数：55 例', dr: 'DR 检查数：388 例', us: '超声检查数：348 例' },
    { id: 'RW-005', date: '日期：2026-10-16', ct: 'CT 检查数：158 例', mr: 'MR 检查数：50 例', dr: 'DR 检查数：372 例', us: '超声检查数：332 例' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pathology/workload - 病理工作量（日期/石蜡/冰冻/细胞学/诊断数）5 条 */
async function handlePathologyWorkload(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PW-001', date: '日期：2026-10-20（周一）', paraffin: '石蜡标本数：86 例', frozen: '冰冻标本数：12 例（手术中快速）', cyto: '细胞学标本数：48 例（TCT/胸腹水）', diag: '诊断数：98 例（含复核）' },
    { id: 'PW-002', date: '日期：2026-10-19', paraffin: '石蜡标本数：78 例', frozen: '冰冻标本数：10 例', cyto: '细胞学标本数：42 例', diag: '诊断数：88 例' },
    { id: 'PW-003', date: '日期：2026-10-18', paraffin: '石蜡标本数：62 例', frozen: '冰冻标本数：8 例', cyto: '细胞学标本数：36 例', diag: '诊断数：70 例' },
    { id: 'PW-004', date: '日期：2026-10-17', paraffin: '石蜡标本数：72 例', frozen: '冰冻标本数：11 例', cyto: '细胞学标本数：44 例', diag: '诊断数：82 例' },
    { id: 'PW-005', date: '日期：2026-10-16', paraffin: '石蜡标本数：68 例', frozen: '冰冻标本数：9 例', cyto: '细胞学标本数：40 例', diag: '诊断数：76 例' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/party/activities - 党建活动（月份/三会一课/主题党日/参与党员数/出勤率）5 条 */
async function handlePartyActivities(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PA-001', month: '月份：2026-09（全院党员 486 人）',三会一课: '三会一课次数：14 次（支委会/党员大会/党小组会/党课）', theme: '主题党日次数：1 次（"健康中国 健澜先行"）', members: '参与党员数：462 人次', rate: '活动出勤率：95.1%' },
    { id: 'PA-002', month: '月份：2026-08',三会一课: '三会一课次数：12 次', theme: '主题党日次数：1 次（"重温入党誓词"）', members: '参与党员数：448 人次', rate: '活动出勤率：92.5%' },
    { id: 'PA-003', month: '月份：2026-07',三会一课: '三会一课次数：13 次（含"七一"专题党课）', theme: '主题党日次数：1 次（"七一表彰"）', members: '参与党员数：470 人次', rate: '活动出勤率：96.7%' },
    { id: 'PA-004', month: '月份：2026-06',三会一课: '三会一课次数：11 次', theme: '主题党日次数：1 次（"健康义诊进社区"）', members: '参与党员数：432 人次', rate: '活动出勤率：88.9%' },
    { id: 'PA-005', month: '月份：2026-05',三会一课: '三会一课次数：10 次', theme: '主题党日次数：1 次（"廉政警示教育"）', members: '参与党员数：418 人次', rate: '活动出勤率：86.0%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/discipline/inspection - 纪检监察（月份/信访件/立案/结案/在办）5 条 */
async function handleDisciplineInspection(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DI-001', month: '月份：2026-09（累计办结率 85.7%）', petitions: '信访件数：7 件（含实名 5 件）', filed: '立案数：2 件（违反医德医风/收红包线索）', closed: '结案数：6 件', ongoing: '在办件数：3 件（含跨年度 1 件）' },
    { id: 'DI-002', month: '月份：2026-08', petitions: '信访件数：6 件', filed: '立案数：1 件', closed: '结案数：5 件', ongoing: '在办件数：4 件' },
    { id: 'DI-003', month: '月份：2026-07', petitions: '信访件数：5 件', filed: '立案数：1 件', closed: '结案数：4 件', ongoing: '在办件数：3 件' },
    { id: 'DI-004', month: '月份：2026-06', petitions: '信访件数：4 件', filed: '立案数：0 件', closed: '结案数：4 件', ongoing: '在办件数：2 件' },
    { id: 'DI-005', month: '月份：2026-05', petitions: '信访件数：5 件', filed: '立案数：1 件', closed: '结案数：4 件', ongoing: '在办件数：3 件' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/union/welfare - 工会福利（项目/节日慰问/困难补助/文体活动/金额）5 条 */
async function handleUnionWelfare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'UW-001', project: '项目：2026 年中秋国庆慰问', festival: '节日慰问人次：1,860 人（全员覆盖）', hardship: '困难补助人次：24 人（大病/家庭困难职工）', sports: '文体活动场次：6 场（健步走/球类/书法）', amount: '发放金额：68.6 万元（含实物折算）' },
    { id: 'UW-002', project: '项目：2026 年端午慰问', festival: '节日慰问人次：1,845 人', hardship: '困难补助人次：18 人', sports: '文体活动场次：4 场', amount: '发放金额：42.3 万元' },
    { id: 'UW-003', project: '项目：2026 年春节慰问', festival: '节日慰问人次：1,880 人（含退休职工 210 人）', hardship: '困难补助人次：32 人', sports: '文体活动场次：8 场（春节团拜/书画展）', amount: '发放金额：96.8 万元' },
    { id: 'UW-004', project: '项目：2026 年职工健康体检统筹', festival: '节日慰问人次：0（专项体检项目）', hardship: '困难补助人次：0', sports: '文体活动场次：0（配合体检优惠筛查）', amount: '发放金额：58.2 万元（体检经费）' },
    { id: 'UW-005', project: '项目：2026 年夏季送清凉', festival: '节日慰问人次：1,260 人（高温科室一线）', hardship: '困难补助人次：6 人', sports: '文体活动场次：2 场（夏季游泳联谊）', amount: '发放金额：18.5 万元（清凉物资）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m490Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/workload', handle: handleLabWorkload, auth: true },
  { method: 'GET', path: '/api/v1/radiology/workload', handle: handleRadiologyWorkload, auth: true },
  { method: 'GET', path: '/api/v1/pathology/workload', handle: handlePathologyWorkload, auth: true },
  { method: 'GET', path: '/api/v1/party/activities', handle: handlePartyActivities, auth: true },
  { method: 'GET', path: '/api/v1/discipline/inspection', handle: handleDisciplineInspection, auth: true },
  { method: 'GET', path: '/api/v1/union/welfare', handle: handleUnionWelfare, auth: true },
];
