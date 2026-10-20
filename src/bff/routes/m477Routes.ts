/**
 * 健澜科技 jlmedaios - M477 P0 合规：互联网医院闭环 / 数据质量治理 / 隐私安全
 *
 * 互联网医院在线复诊订单 / 在线处方流转 / 数据质量规则命中 / 数据质量月报
 * （security/privacy-classification、security/audit-anomaly 已存在，不重复建）。
 * 避开 M440 telemedicine/*、M434 privacy 既有、M452 audit 既有、M471-M476 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/internet-visit/orders - 互联网医院在线复诊订单（订单号/患者/科室/医生/状态/金额）5 条 */
async function handleInternetOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IVO-001', orderNo: '订单号：INV-20261020-000123', patient: '患者：张***（成人慢病复诊）', dept: '科室：心血管内科', doctor: '医生：王*** 副主任医师', status: '状态：已完成（在线复诊+电子处方）', amount: '金额：复诊费 35 元' },
    { id: 'IVO-002', orderNo: '订单号：INV-20261020-000124', patient: '患者：李***（高血压随访）', dept: '科室：内分泌科', doctor: '医生：赵*** 主治医师', status: '状态：待接诊（已支付，排队中）', amount: '金额：复诊费 25 元' },
    { id: 'IVO-003', orderNo: '订单号：INV-20261020-000125', patient: '患者：陈***（儿科复诊）', dept: '科室：儿科', doctor: '医生：孙*** 主任医师', status: '状态：已完成（图文咨询）', amount: '金额：咨询费 50 元' },
    { id: 'IVO-004', orderNo: '订单号：INV-20261020-000126', patient: '患者：刘***（皮肤科复诊）', dept: '科室：皮肤科', doctor: '医生：周*** 主治医师', status: '状态：已退单（医生未接诊，自动退款）', amount: '金额：复诊费 30 元（已原路退回）' },
    { id: 'IVO-005', orderNo: '订单号：INV-20261020-000127', patient: '患者：吴***（慢病续方）', dept: '科室：呼吸内科', doctor: '医生：郑*** 副主任医师', status: '状态：已完成（复诊+处方流转到药房）', amount: '金额：复诊费 35 元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/internet-visit/prescriptions - 在线处方流转（处方号/状态/流转机构/配药状态/退款状态）5 条 */
async function handleInternetPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IVP-001', rxNo: '处方号：ERX-20261020-000088', status: '状态：已审核（药师审方通过）', agency: '流转机构：本院互联网药房（中心药房）', dispense: '配药状态：已调配、待取药/配送', refund: '退款状态：无退款' },
    { id: 'IVP-002', rxNo: '处方号：ERX-20261020-000089', status: '状态：已驳回（超量，医生已调整）', agency: '流转机构：本院互联网药房', dispense: '配药状态：未调配（待医生重开）', refund: '退款状态：待确认（未支付处方不产生费用）' },
    { id: 'IVP-003', rxNo: '处方号：ERX-20261020-000090', status: '状态：已完成', agency: '流转机构：院外合作药店（处方流转）', dispense: '配药状态：药店已发药、患者已签收', refund: '退款状态：无退款' },
    { id: 'IVP-004', rxNo: '处方号：ERX-20261020-000091', status: '状态：待审核（药师处理中）', agency: '流转机构：本院互联网药房', dispense: '配药状态：待审核通过后调配', refund: '退款状态：无退款' },
    { id: 'IVP-005', rxNo: '处方号：ERX-20261020-000092', status: '状态：已退方（患者取消）', agency: '流转机构：院外合作药店', dispense: '配药状态：药店未发药', refund: '退款状态：药费已原路退回' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/data-quality/rules - 数据质量规则命中（规则名/表/空值率/格式错误数/值域越界数）5 条 */
async function handleDataQualityRules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DQR-001', rule: '规则名：患者主键必填（姓名/证件号）', table: '表：patient_demo', nullRate: '空值率：0.02%', formatErr: '格式错误数：3 条（手机号格式）', rangeErr: '值域越界数：0 条' },
    { id: 'DQR-002', rule: '规则名：检验结果单位与值域一致性', table: '表：lab_result_item', nullRate: '空值率：0.15%', formatErr: '格式错误数：12 条（参考值单位不统一）', rangeErr: '值域越界数：5 条（年龄超出合理区间）' },
    { id: 'DQR-003', rule: '规则名：出院日期 ≥ 入院日期（时序约束）', table: '表：encounter_inpatient', nullRate: '空值率：0.01%', formatErr: '格式错误数：0 条', rangeErr: '值域越界数：2 条（时序倒挂，待修）' },
    { id: 'DQR-004', rule: '规则名：诊断编码字典映射完整性', table: '表：diagnosis', nullRate: '空值率：0.08%', formatErr: '格式错误数：0 条', rangeErr: '值域越界数：8 条（本地码未映射国标 ICD）' },
    { id: 'DQR-005', rule: '规则名：医嘱开立时间与执行时间逻辑', table: '表：order_item', nullRate: '空值率：0.05%', formatErr: '格式错误数：0 条', rangeErr: '值域越界数：1 条（执行早于开立，异常）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/data-quality/monthly-report - 数据质量月报（月份/完整率/准确率/一致率/及时率）5 条 */
async function handleDataQualityMonthly(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DQM-001', month: '月份：2026-06', complete: '完整率：97.8%', accurate: '准确率：96.2%', consist: '一致率：95.5%', timely: '及时率：96.8%' },
    { id: 'DQM-002', month: '月份：2026-07', complete: '完整率：98.1%', accurate: '准确率：96.8%', consist: '一致率：96.0%', timely: '及时率：97.2%' },
    { id: 'DQM-003', month: '月份：2026-08', complete: '完整率：98.5%', accurate: '准确率：97.3%', consist: '一致率：96.6%', timely: '及时率：97.8%' },
    { id: 'DQM-004', month: '月份：2026-09', complete: '完整率：98.9%', accurate: '准确率：97.9%', consist: '一致率：97.2%', timely: '及时率：98.3%' },
    { id: 'DQM-005', month: '月份：2026-10（截至 20 日）', complete: '完整率：99.0%', accurate: '准确率：98.1%', consist: '一致率：97.5%', timely: '及时率：98.5%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m477Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/internet-visit/orders', handle: handleInternetOrders, auth: true },
  { method: 'GET', path: '/api/v1/internet-visit/prescriptions', handle: handleInternetPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/data-quality/rules', handle: handleDataQualityRules, auth: true },
  { method: 'GET', path: '/api/v1/data-quality/monthly-report', handle: handleDataQualityMonthly, auth: true },
];
