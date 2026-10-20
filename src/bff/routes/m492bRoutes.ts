/**
 * 健澜科技 jlmedaios - M492b P0 合规：患者随访 + 30天再入院 + 伦理审查
 *
 * patient/followup-* 走汇总口径（与 M477 /followup/* 明细区分）；
 * quality/readmission-* 走 30 天再入院质控口径；
 * research/ethics-* 走伦理委员会审查口径（与 M464/M485 科研项目/论文/专利区分）。
 * 避开 M477·M479·M485·M492·M491·M490 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/followup-plan - 随访计划（病种/周期/负责人/应随访数/完成率）5 条 */
async function handleFollowupPlan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FP-001', disease: '病种：冠心病 PCI 术后', cycle: '随访周期：1/3/6/12 个月（年度）', owner: '负责人：心内科随访护士 王老师', due: '应随访数：186 人（近 12 个月出院）', rate: '完成率：92.5%（172 人已完成）' },
    { id: 'FP-002', disease: '病种：糖尿病（2 型）', cycle: '随访周期：每 3 个月（季度）', owner: '负责人：内分泌科随访护士 李老师', due: '应随访数：320 人', rate: '完成率：88.2%（282 人已完成）' },
    { id: 'FP-003', disease: '病种：脑卒中（脑梗）', cycle: '随访周期：1/6/12 个月', owner: '负责人：神经内科随访团队 张老师', due: '应随访数：148 人', rate: '完成率：86.5%（128 人已完成）' },
    { id: 'FP-004', disease: '病种：肿瘤术后（胃肠）', cycle: '随访周期：每 3 个月（前 2 年）', owner: '负责人：肿瘤科随访护士 陈老师', due: '应随访数：96 人', rate: '完成率：90.6%（87 人已完成）' },
    { id: 'FP-005', disease: '病种：慢阻肺（COPD）', cycle: '随访周期：每 6 个月', owner: '负责人：呼吸与危重症医学科 刘老师', due: '应随访数：82 人', rate: '完成率：84.1%（69 人已完成）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/followup-result - 随访结果（病种/存活/好转/死亡/失访）5 条 */
async function handleFollowupResult(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FR-001', disease: '病种：冠心病 PCI 术后（172 人完成）', alive: '存活数：168 人（97.7%）', improved: '好转数：148 人（心功能改善 Ⅰ-Ⅱ 级）', death: '死亡数：4 人（2.3%，含心源性猝死 2 例）', lost: '失访数：14 人（联系不上/拒绝随访）' },
    { id: 'FR-002', disease: '病种：2 型糖尿病（282 人完成）', alive: '存活数：278 人（98.6%）', improved: '好转数：226 人（HbA1c 达标 ≤7%）', death: '死亡数：4 人（1.4%）', lost: '失访数：38 人' },
    { id: 'FR-003', disease: '病种：脑梗（128 人完成）', alive: '存活数：122 人（95.3%）', improved: '好转数：96 人（mRS 0-2 级生活自理）', death: '死亡数：6 人（4.7%）', lost: '失访数：20 人' },
    { id: 'FR-004', disease: '病种：胃肠肿瘤术后（87 人完成）', alive: '存活数：78 人（89.7%）', improved: '好转数：62 人（无复发/转移）', death: '死亡数：9 人（10.3%）', lost: '失访数：9 人' },
    { id: 'FR-005', disease: '病种：慢阻肺（69 人完成）', alive: '存活数：66 人（95.7%）', improved: '好转数：48 人（急性加重次数减少）', death: '死亡数：3 人（4.3%）', lost: '失访数：13 人' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/readmission-30d - 30天再入院率（科室/出院数/再入院数/再入院率/同比）5 条 */
async function handleReadmission30d(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'R30-001', dept: '科室：心血管内科（2026-Q3）', discharges: '出院数：862 例', readmit: '30 天再入院数：52 例', rate: '再入院率：6.0%（全院均值 5.2%）', yoy: '同比：+0.4pct（去年同期 5.6%）' },
    { id: 'R30-002', dept: '科室：呼吸与危重症医学科', discharges: '出院数：620 例', readmit: '30 天再入院数：48 例', rate: '再入院率：7.7%（慢阻肺急性加重）', yoy: '同比：+0.6pct' },
    { id: 'R30-003', dept: '科室：神经内科', discharges: '出院数：548 例', readmit: '30 天再入院数：32 例', rate: '再入院率：5.8%', yoy: '同比：-0.2pct（改善）' },
    { id: 'R30-004', dept: '科室：肿瘤科', discharges: '出院数：386 例', readmit: '30 天再入院数：26 例', rate: '再入院率：6.7%（化疗相关并发症）', yoy: '同比：+0.3pct' },
    { id: 'R30-005', dept: '科室：普外科', discharges: '出院数：720 例', readmit: '30 天再入院数：24 例', rate: '再入院率：3.3%（术后并发症少）', yoy: '同比：-0.5pct（持续改善）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/readmission-top - 30天再入院Top病种（病种/出院例数/再入院例数/再入院率/排名）5 条 */
async function handleReadmissionTop(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RT-001', disease: '病种：慢阻肺急性加重（AECOPD）', discharges: '出院例数：186 例', readmit: '再入院例数：22 例', rate: '再入院率：11.8%', rank: '全院排名：Top 1（首位）' },
    { id: 'RT-002', disease: '病种：充血性心力衰竭（CHF）', discharges: '出院例数：142 例', readmit: '再入院例数：14 例', rate: '再入院率：9.9%', rank: '全院排名：Top 2' },
    { id: 'RT-003', disease: '病种：2 型糖尿病伴并发症', discharges: '出院例数：268 例', readmit: '再入院例数：18 例', rate: '再入院率：6.7%', rank: '全院排名：Top 3' },
    { id: 'RT-004', disease: '病种：急性心肌梗死（PCI 术后）', discharges: '出院例数：96 例', readmit: '再入院例数：6 例', rate: '再入院率：6.3%', rank: '全院排名：Top 4' },
    { id: 'RT-005', disease: '病种：脑梗死后遗症', discharges: '出院例数：128 例', readmit: '再入院例数：8 例', rate: '再入院率：6.2%', rank: '全院排名：Top 5' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/ethics-committee - 伦理委员会（月份/待审/在审/通过/驳回）5 条 */
async function handleEthicsCommittee(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EC-001', month: '月份：2026-09（伦理委员会 15 人）', pending: '待审项目数：8 项（新申报）', reviewing: '在审项目数：12 项（含快速审查 6 项）', approved: '通过数：18 项（含会议审查 12 项）', rejected: '驳回数：2 项（研究方案不规范）' },
    { id: 'EC-002', month: '月份：2026-08', pending: '待审项目数：6 项', reviewing: '在审项目数：10 项', approved: '通过数：14 项', rejected: '驳回数：1 项' },
    { id: 'EC-003', month: '月份：2026-07', pending: '待审项目数：5 项', reviewing: '在审项目数：8 项', approved: '通过数：12 项', rejected: '驳回数：1 项' },
    { id: 'EC-004', month: '月份：2026-06', pending: '待审项目数：7 项', reviewing: '在审项目数：9 项', approved: '通过数：10 项', rejected: '驳回数：0 项' },
    { id: 'EC-005', month: '月份：2026-05', pending: '待审项目数：4 项', reviewing: '在审项目数：7 项', approved: '通过数：8 项', rejected: '驳回数：0 项' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/ethics-cases - 伦理审查案例（项目名/日期/结论/跟踪次数/状态）5 条 */
async function handleEthicsCases(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ECASE-001', name: '项目名："新型抗凝药在非瓣膜性房颤中的多中心 RCT"（ZY2026-001）', date: '审查日期：2026-09-12（会议审查）', conclusion: '审查结论：同意开展（附 5 条修改建议）', followup: '跟踪次数：2 次（年度跟踪审查）', status: '状态：进行中（已入组 86/240 例）' },
    { id: 'ECASE-002', name: '项目名："AI 辅助影像诊断系统在肺结节筛查中的临床评价"（ZY2026-008）', date: '审查日期：2026-08-26（快速审查）', conclusion: '审查结论：同意开展', followup: '跟踪次数：1 次', status: '状态：进行中（已完成 120 例）' },
    { id: 'ECASE-003', name: '项目名："中药复方治疗慢性胃炎的疗效与安全性研究"（ZY2026-012）', date: '审查日期：2026-08-10（会议审查）', conclusion: '审查结论：修改后同意（知情同意书需补充风险告知）', followup: '跟踪次数：1 次', status: '状态：已补充材料再审（待启动）' },
    { id: 'ECASE-004', name: '项目名："CAR-T 细胞治疗复发难治性 B 细胞淋巴瘤的Ⅰ期临床"（ZY2026-018）', date: '审查日期：2026-09-05（会议审查·主审委员特别关注）', conclusion: '审查结论：同意开展（附严重不良事件 SAE 报告预案）', followup: '跟踪次数：3 次（含 SAE 跟踪 1 次）', status: '状态：进行中（已入组 12 例）' },
    { id: 'ECASE-005', name: '项目名："糖尿病足溃疡保守治疗 vs 手术治疗的卫生经济学评价"（ZY2026-022）', date: '审查日期：2026-07-18（快速审查）', conclusion: '审查结论：同意开展（回顾性研究免除知情同意）', followup: '跟踪次数：1 次', status: '状态：已结题（论文已投稿）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m492bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/followup-plan', handle: handleFollowupPlan, auth: true },
  { method: 'GET', path: '/api/v1/patient/followup-result', handle: handleFollowupResult, auth: true },
  { method: 'GET', path: '/api/v1/quality/readmission-30d', handle: handleReadmission30d, auth: true },
  { method: 'GET', path: '/api/v1/quality/readmission-top', handle: handleReadmissionTop, auth: true },
  { method: 'GET', path: '/api/v1/research/ethics-committee', handle: handleEthicsCommittee, auth: true },
  { method: 'GET', path: '/api/v1/research/ethics-cases', handle: handleEthicsCases, auth: true },
];
