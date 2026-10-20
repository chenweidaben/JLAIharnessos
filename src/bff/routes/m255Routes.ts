/**
 * 健澜科技 jlmedaios - M255 互联网医院 + 财务深化
 *
 * 在线问诊/处方/支付 + 门诊收费/医保结算/退费
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、互联网医院 ==================== */

/** GET /api/v1/internet/consultations - 在线问诊 5 条 */
async function handleInternetConsultations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const consultations = [
    { id: 'IC-001', patient: '王***', doctor: '李***（心内科）', dept: '心内科', status: '问诊中', time: '2026-10-20 10:00' },
    { id: 'IC-002', patient: '张***', doctor: '赵***（内分泌）', dept: '内分泌科', status: '待接诊', time: '2026-10-20 10:15' },
    { id: 'IC-003', patient: '李***', doctor: '陈***（骨科）', dept: '骨科', status: '已完成', time: '2026-10-20 09:30' },
    { id: 'IC-004', patient: '赵***', doctor: '王***（急诊）', dept: '急诊医学科', status: '问诊中', time: '2026-10-20 10:20' },
    { id: 'IC-005', patient: '陈***', doctor: '刘***（呼吸）', dept: '呼吸内科', status: '已完成', time: '2026-10-20 08:45' },
  ];

  return json(ok({ consultations, totalCount: consultations.length }));
}

/** GET /api/v1/internet/prescriptions - 在线处方 5 条 */
async function handleInternetPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const prescriptions = [
    { id: 'IP-001', patient: '王***', doctor: '李***（心内科）', meds: '阿司匹林 100mg qd × 30 天', amount: '¥45.00', status: '已发药' },
    { id: 'IP-002', patient: '张***', doctor: '赵***（内分泌）', meds: '二甲双胍 0.5g bid × 30 天', amount: '¥32.00', status: '待审核' },
    { id: 'IP-003', patient: '李***', doctor: '陈***（骨科）', meds: '布洛芬 0.3g bid × 7 天', amount: '¥18.00', status: '已发药' },
    { id: 'IP-004', patient: '赵***', doctor: '王***（急诊）', meds: '头孢呋辛 0.25g bid × 7 天', amount: '¥56.00', status: '已作废' },
    { id: 'IP-005', patient: '陈***', doctor: '刘***（呼吸）', meds: '氨溴索 30mg tid × 7 天', amount: '¥25.00', status: '已发药' },
  ];

  return json(ok({ prescriptions, totalCount: prescriptions.length }));
}

/** GET /api/v1/internet/payments - 在线支付 5 条 */
async function handleInternetPayments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const payments = [
    { id: 'PAY-001', orderNo: 'ORD-20261020-001', amount: '¥50.00', method: '微信支付', time: '2026-10-20 10:05', status: '已支付' },
    { id: 'PAY-002', orderNo: 'ORD-20261020-002', amount: '¥120.00', method: '支付宝', time: '2026-10-20 09:40', status: '已支付' },
    { id: 'PAY-003', orderNo: 'ORD-20261020-003', amount: '¥200.00', method: '医保在线支付', time: '2026-10-20 09:50', status: '已支付' },
    { id: 'PAY-004', orderNo: 'ORD-20261020-004', amount: '¥80.00', method: '微信支付', time: '2026-10-20 10:10', status: '已退款' },
    { id: 'PAY-005', orderNo: 'ORD-20261020-005', amount: '¥150.00', method: '支付宝', time: '2026-10-20 10:25', status: '待支付' },
  ];

  return json(ok({ payments, totalCount: payments.length }));
}

/* ==================== 二、财务深化 ==================== */

/** GET /api/v1/financial/billing - 门诊收费 5 条 */
async function handleFinancialBilling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const billings = [
    { id: 'FB-001', patient: '张***', item: '心内科门诊挂号费', amount: '¥25.00', cashier: '前台 王***', time: '2026-10-20 08:35' },
    { id: 'FB-002', patient: '张***', item: '胸部 CT（平扫）', amount: '¥280.00', cashier: '前台 王***', time: '2026-10-20 09:00' },
    { id: 'FB-003', patient: '李***', item: '血常规（五分类）', amount: '¥35.00', cashier: '收费处 李***', time: '2026-10-20 09:20' },
    { id: 'FB-004', patient: '王***', item: '心电图检查', amount: '¥45.00', cashier: '收费处 李***', time: '2026-10-20 10:00' },
    { id: 'FB-005', patient: '赵***', item: '内分泌门诊挂号费', amount: '¥30.00', cashier: '前台 王***', time: '2026-10-20 10:10' },
  ];

  return json(ok({ billings, totalCount: billings.length }));
}

/** GET /api/v1/financial/insurance - 医保结算 5 条 */
async function handleFinancialInsurance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const settlements = [
    { id: 'INS-001', patient: '张***', totalFee: '¥305.00', insuranceCovered: '¥210.00', outOfPocket: '¥95.00', status: '已结算' },
    { id: 'INS-002', patient: '李***', totalFee: '¥35.00', insuranceCovered: '¥24.00', outOfPocket: '¥11.00', status: '已结算' },
    { id: 'INS-003', patient: '王***', totalFee: '¥45.00', insuranceCovered: '¥31.50', outOfPocket: '¥13.50', status: '已结算' },
    { id: 'INS-004', patient: '赵***', totalFee: '¥500.00', insuranceCovered: '¥380.00', outOfPocket: '¥120.00', status: '待结算' },
    { id: 'INS-005', patient: '陈***', totalFee: '¥120.00', insuranceCovered: '¥84.00', outOfPocket: '¥36.00', status: '已结算' },
  ];

  return json(ok({ settlements, totalCount: settlements.length }));
}

/** GET /api/v1/financial/refunds - 退费记录 5 条 */
async function handleFinancialRefunds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const refunds = [
    { id: 'REF-001', patient: '赵***', originalAmount: '¥80.00', refundAmount: '¥80.00', reason: '检查取消（患者改约）', approvalStatus: '已审批（财务科）' },
    { id: 'REF-002', patient: '王***', originalAmount: '¥280.00', refundAmount: '¥0.00', reason: 'CT 未做（医生改开 MRI）', approvalStatus: '待审批' },
    { id: 'REF-003', patient: '李***', originalAmount: '¥45.00', refundAmount: '¥45.00', reason: '重复收费', approvalStatus: '已审批（收费处）' },
    { id: 'REF-004', patient: '张***', originalAmount: '¥30.00', refundAmount: '¥30.00', reason: '退号（患者未就诊）', approvalStatus: '已审批（门诊部）' },
    { id: 'REF-005', patient: '陈***', originalAmount: '¥200.00', refundAmount: '¥0.00', reason: '处方作废（过敏）', approvalStatus: '已驳回' },
  ];

  return json(ok({ refunds, totalCount: refunds.length }));
}

export const m255Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/internet/consultations', handle: handleInternetConsultations, auth: true },
  { method: 'GET', path: '/api/v1/internet/prescriptions', handle: handleInternetPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/internet/payments', handle: handleInternetPayments, auth: true },
  { method: 'GET', path: '/api/v1/financial/billing', handle: handleFinancialBilling, auth: true },
  { method: 'GET', path: '/api/v1/financial/insurance', handle: handleFinancialInsurance, auth: true },
  { method: 'GET', path: '/api/v1/financial/refunds', handle: handleFinancialRefunds, auth: true },
];
