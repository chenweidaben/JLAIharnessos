/**
 * 健澜科技 jlmedaios - M436 财务收费深度（billing / finance）
 *
 * 在院账单/缴费记录/月结报表
 * （billing/refunds 退费、finance/invoices-detail 电子发票、finance/budgets-detail 科室预算已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/billing/bills - 在院账单（账单号/患者/科室/累计金额/状态）5 条 */
async function handleBillBills(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BBL-001', billNo: '账单号：BD-20261020-001（住院在院）', patient: '患者：张***（男，65 岁，心内科在院第 3 天）', dept: '科室：心血管内科 3 床', amount: '累计金额：8,426.30 元（押金 5,000，待补 3,426.30）', status: '状态：在院记账中（每日费用自动归集）' },
    { id: 'BBL-002', billNo: '账单号：BD-20261020-002（住院在院）', patient: '患者：李***（女，58 岁，内分泌科在院第 5 天）', dept: '科室：内分泌科 12 床', amount: '累计金额：12,180.00 元（押金 10,000，待补 2,180.00）', status: '状态：在院记账中' },
    { id: 'BBL-003', billNo: '账单号：BD-20261020-003（门诊预交）', patient: '患者：王***（男，72 岁，骨科待手术）', dept: '科室：骨科（术前预交金）', amount: '累计金额：20,000.00 元（手术预交金，未发生费用）', status: '状态：预交金冻结（待术后结算）' },
    { id: 'BBL-004', billNo: '账单号：BD-20261019-018（已出院待结算）', patient: '患者：陈***（男，45 岁，普外科术后）', dept: '科室：普外科 8 床（已出院）', amount: '累计金额：16,732.50 元（押金 15,000，待补 1,732.50）', status: '状态：待出院结算（费用已封账）' },
    { id: 'BBL-005', billNo: '账单号：BD-20261020-004（门诊当日）', patient: '患者：赵***（女，32 岁，妇产科门诊）', dept: '科室：妇产科门诊', amount: '累计金额：428.60 元（检查+药费，已缴清）', status: '状态：已结清' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/billing/payments - 缴费记录（订单号/患者/金额/渠道/时间）5 条 */
async function handleBillPayments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BPM-001', orderNo: '订单号：PAY-20261020-0901（住院补费）', patient: '患者：张***（男，65 岁）', amount: '金额：3,426.30 元（押金补差）', channel: '渠道：微信支付（医保个账+自费组合）', time: '时间：2026-10-20 09:18:42' },
    { id: 'BPM-002', orderNo: '订单号：PAY-20261020-0902（门诊缴费）', patient: '患者：赵***（女，32 岁）', amount: '金额：428.60 元（检查+药费）', channel: '渠道：支付宝（自费）', time: '时间：2026-10-20 09:52:10' },
    { id: 'BPM-003', orderNo: '订单号：PAY-20261020-0903（住院押金）', patient: '患者：王***（男，72 岁）', amount: '金额：20,000.00 元（手术预交金）', channel: '渠道：银行卡（POS 刷卡）', time: '时间：2026-10-20 10:25:36' },
    { id: 'BPM-004', orderNo: '订单号：PAY-20261019-0880（门诊挂号+检查）', patient: '患者：刘***（女，60 岁）', amount: '金额：265.00 元', channel: '渠道：医保移动支付（统筹+个账）', time: '时间：2026-10-19 15:40:22' },
    { id: 'BPM-005', orderNo: '订单号：PAY-20261020-0904（住院预缴金续缴）', patient: '患者：李***（女，58 岁）', amount: '金额：2,180.00 元（押金补差）', channel: '渠道：微信支付（自费）', time: '时间：2026-10-20 11:05:58' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/monthly-close - 月结报表（月份/门诊收入/住院收入/药品占比/审核状态）5 条 */
async function handleFinMonthlyClose(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FMC-001', month: '月份：2026-09（已结账）', outpatient: '门诊收入：1,862.40 万元', inpatient: '住院收入：4,218.70 万元', drugRatio: '药品占比：28.6%（控制在合理区间）', auditStatus: '审核状态：已审核封账（财务科+审计双签）' },
    { id: 'FMC-002', month: '月份：2026-08（已结账）', outpatient: '门诊收入：1,795.20 万元', inpatient: '住院收入：4,086.30 万元', drugRatio: '药品占比：29.1%', auditStatus: '审核状态：已审核封账' },
    { id: 'FMC-003', month: '月份：2026-07（已结账）', outpatient: '门诊收入：1,720.80 万元', inpatient: '住院收入：3,954.60 万元', drugRatio: '药品占比：30.2%（略高，已分析）', auditStatus: '审核状态：已审核封账' },
    { id: 'FMC-004', month: '月份：2026-10（进行中，未结账）', outpatient: '门诊收入：926.50 万元（截至 20 日）', inpatient: '住院收入：2,105.40 万元（截至 20 日）', drugRatio: '药品占比：28.9%（实时统计）', auditStatus: '审核状态：未结账（月末结转中）' },
    { id: 'FMC-005', month: '月份：2026-06（已结账）', outpatient: '门诊收入：1,688.90 万元', inpatient: '住院收入：3,820.10 万元', drugRatio: '药品占比：30.8%', auditStatus: '审核状态：已审核封账' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m436Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/billing/bills', handle: handleBillBills, auth: true },
  { method: 'GET', path: '/api/v1/billing/payments', handle: handleBillPayments, auth: true },
  { method: 'GET', path: '/api/v1/finance/monthly-close', handle: handleFinMonthlyClose, auth: true },
];
