/**
 * 健澜科技 jlmedaios - M491 P0 合规：病案管理（归档/借阅/复印）+ 医保智能审核
 *
 * 病案 archive-* 走归档台账口径，与 M488 首页质量、M472 5级条目、M475 月度评级区分；
 * insurance smart-audit/daily-settlement/supervision 走智能审核·日结算·监管口径，
 * 与 M481b 既有 expense-audit/drg-settlement/dip-settlement/rejection 区分。
 * 避开 M472·M475·M481b·M488·M490·M487 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/archive-status - 病案归档（月份/待归档/已归档/逾期未归档/归档及时率）5 条 */
async function handleArchiveStatus(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AS-001', month: '月份：2026-09（出院病历 3,860 份）', pending: '待归档数：186 份（出院后 7 天内）', archived: '已归档数：3,624 份（归档率 93.9%）', overdue: '逾期未归档数：50 份（超 7 天）', timely: '归档及时率：96.5%' },
    { id: 'AS-002', month: '月份：2026-08', pending: '待归档数：162 份', archived: '已归档数：3,480 份', overdue: '逾期未归档数：42 份', timely: '归档及时率：96.0%' },
    { id: 'AS-003', month: '月份：2026-07', pending: '待归档数：148 份', archived: '已归档数：3,360 份', overdue: '逾期未归档数：38 份', timely: '归档及时率：95.5%' },
    { id: 'AS-004', month: '月份：2026-06', pending: '待归档数：156 份', archived: '已归档数：3,240 份', overdue: '逾期未归档数：44 份', timely: '归档及时率：94.8%' },
    { id: 'AS-005', month: '月份：2026-05', pending: '待归档数：172 份', archived: '已归档数：3,120 份', overdue: '逾期未归档数：58 份', timely: '归档及时率：93.2%（环比改善中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/archive-borrow - 病案借阅（月份/借出/已归还/逾期未还/借阅人次）5 条 */
async function handleArchiveBorrow(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AB-001', month: '月份：2026-09（全院病案室在档 58,600 份）', out: '借出数：48 份（科研/病历质控/医保核查）', returned: '已归还数：42 份（7 日内归还）', overdue: '逾期未还数：6 份（超 30 天）', people: '借阅人次：52 人次（含外院医保核查 8 人次）' },
    { id: 'AB-002', month: '月份：2026-08', out: '借出数：42 份', returned: '已归还数：38 份', overdue: '逾期未还数：4 份', people: '借阅人次：46 人次' },
    { id: 'AB-003', month: '月份：2026-07', out: '借出数：38 份', returned: '已归还数：34 份', overdue: '逾期未还数：4 份', people: '借阅人次：40 人次' },
    { id: 'AB-004', month: '月份：2026-06', out: '借出数：36 份', returned: '已归还数：32 份', overdue: '逾期未还数：4 份', people: '借阅人次：38 人次' },
    { id: 'AB-005', month: '月份：2026-05', out: '借出数：44 份', returned: '已归还数：36 份', overdue: '逾期未还数：8 份', people: '借阅人次：48 人次' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/archive-copy - 病案复印（月份/申请/已办结/办理时长/费用合计）5 条 */
async function handleArchiveCopy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AC-001', month: '月份：2026-09（患者及家属申请）', apply: '申请数：286 份（含线上申请 168 份）', done: '已办结数：278 份（办结率 97.2%）', duration: '办理时长：平均 1.2 个工作日（≤3 天达标）', fee: '费用合计：3.4 万元（按规定 0.5 元/页）' },
    { id: 'AC-002', month: '月份：2026-08', apply: '申请数：262 份', done: '已办结数：256 份', duration: '办理时长：平均 1.4 个工作日', fee: '费用合计：3.1 万元' },
    { id: 'AC-003', month: '月份：2026-07', apply: '申请数：248 份', done: '已办结数：242 份', duration: '办理时长：平均 1.5 个工作日', fee: '费用合计：2.9 万元' },
    { id: 'AC-004', month: '月份：2026-06', apply: '申请数：236 份', done: '已办结数：230 份', duration: '办理时长：平均 1.6 个工作日', fee: '费用合计：2.8 万元' },
    { id: 'AC-005', month: '月份：2026-05', apply: '申请数：252 份', done: '已办结数：240 份', duration: '办理时长：平均 1.8 个工作日', fee: '费用合计：3.0 万元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/smart-audit - 医保智能审核（月份/规则命中/拒付金额/申诉/申诉成功率）5 条 */
async function handleInsuranceSmartAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ISA-001', month: '月份：2026-09（医保结算 2,860 例）', hits: '规则命中数：342 例（不合理用药/超适应症/分解住院）', reject: '拒付金额：12.6 万元（占结算 0.44%）', appeal: '申诉数：86 例（科室提交申诉）', success: '申诉成功率：62.8%（54 例申诉成功）' },
    { id: 'ISA-002', month: '月份：2026-08', hits: '规则命中数：318 例', reject: '拒付金额：11.2 万元', appeal: '申诉数：78 例', success: '申诉成功率：60.3%' },
    { id: 'ISA-003', month: '月份：2026-07', hits: '规则命中数：296 例', reject: '拒付金额：10.4 万元', appeal: '申诉数：72 例', success: '申诉成功率：58.3%' },
    { id: 'ISA-004', month: '月份：2026-06', hits: '规则命中数：328 例', reject: '拒付金额：11.8 万元', appeal: '申诉数：80 例', success: '申诉成功率：56.0%' },
    { id: 'ISA-005', month: '月份：2026-05', hits: '规则命中数：356 例', reject: '拒付金额：13.2 万元', appeal: '申诉数：92 例', success: '申诉成功率：52.2%（环比改善中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/daily-settlement - 医保日结算（日期/今日结算额/DRG占比/DIP占比/项目占比）5 条 */
async function handleInsuranceDailySettlement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDS-001', date: '日期：2026-10-20（周一）', today: '今日结算额：48.6 万元', drg: 'DRG 结算占比：42.8%（20.8 万元）', dip: 'DIP 结算占比：38.5%（18.7 万元）', item: '项目结算占比：18.7%（9.1 万元，门慢/门特）' },
    { id: 'IDS-002', date: '日期：2026-10-19', today: '今日结算额：46.2 万元', drg: 'DRG 结算占比：43.2%', dip: 'DIP 结算占比：38.0%', item: '项目结算占比：18.8%' },
    { id: 'IDS-003', date: '日期：2026-10-18', today: '今日结算额：38.4 万元（周末）', drg: 'DRG 结算占比：40.5%', dip: 'DIP 结算占比：36.2%', item: '项目结算占比：23.3%（周末门特增多）' },
    { id: 'IDS-004', date: '日期：2026-10-17', today: '今日结算额：44.8 万元', drg: 'DRG 结算占比：42.0%', dip: 'DIP 结算占比：38.8%', item: '项目结算占比：19.2%' },
    { id: 'IDS-005', date: '日期：2026-10-16', today: '今日结算额：43.6 万元', drg: 'DRG 结算占比：41.5%', dip: 'DIP 结算占比：39.0%', item: '项目结算占比：19.5%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/supervision - 医保监管（月份/飞检/稽核/违规金额/整改完成率）5 条 */
async function handleInsuranceSupervision(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ISUP-001', month: '月份：2026-09（配合上级医保部门检查）', flight: '飞检次数：2 次（省医保局飞行检查）', audit: '稽核件数：36 件（含疑点数据核查）', violation: '违规金额：8.6 万元（已退回医保基金）', rectify: '整改完成率：92.3%（24 件已闭环整改）' },
    { id: 'ISUP-002', month: '月份：2026-08', flight: '飞检次数：1 次', audit: '稽核件数：28 件', violation: '违规金额：6.2 万元', rectify: '整改完成率：90.0%' },
    { id: 'ISUP-003', month: '月份：2026-07', flight: '飞检次数：1 次', audit: '稽核件数：24 件', violation: '违规金额：5.4 万元', rectify: '整改完成率：88.0%' },
    { id: 'ISUP-004', month: '月份：2026-06', flight: '飞检次数：0 次', audit: '稽核件数：20 件', violation: '违规金额：3.8 万元', rectify: '整改完成率：85.0%' },
    { id: 'ISUP-005', month: '月份：2026-05', flight: '飞检次数：0 次', audit: '稽核件数：22 件', violation: '违规金额：4.2 万元', rectify: '整改完成率：82.0%（环比改善中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m491Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/archive-status', handle: handleArchiveStatus, auth: true },
  { method: 'GET', path: '/api/v1/emr/archive-borrow', handle: handleArchiveBorrow, auth: true },
  { method: 'GET', path: '/api/v1/emr/archive-copy', handle: handleArchiveCopy, auth: true },
  { method: 'GET', path: '/api/v1/insurance/smart-audit', handle: handleInsuranceSmartAudit, auth: true },
  { method: 'GET', path: '/api/v1/insurance/daily-settlement', handle: handleInsuranceDailySettlement, auth: true },
  { method: 'GET', path: '/api/v1/insurance/supervision', handle: handleInsuranceSupervision, auth: true },
];
