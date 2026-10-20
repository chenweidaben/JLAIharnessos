/**
 * 健澜科技 jlmedaios - M369 P1 业务扩展：互联网医院深度打磨
 *
 * 在线处方/在线支付/药品配送/在线随访/互联网医院报告（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemed/prescriptions - 在线处方 5 条 */
async function handleTelemedPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TP-001', prescriptionNo: 'RX-2026-10-20-000001', patientName: '张***（65 岁男性，心内科患者）', drugName: '阿司匹林肠溶片 100mg×30 片（每日 1 片，口服）', doctor: '李***（心内科主治医师）', time: '2026-10-20 10:00:00（处方开具时间）' },
    { id: 'TP-002', prescriptionNo: 'RX-2026-10-20-000002', patientName: '李***（55 岁女性，骨科患者）', drugName: '布洛芬缓释胶囊 0.3g×20 粒（每日 2 粒，口服）', doctor: '赵***（骨科主任医师）', time: '2026-10-20 11:00:00（处方开具时间）' },
    { id: 'TP-003', prescriptionNo: 'RX-2026-10-20-000003', patientName: '王***（60 岁男性，内分泌科患者）', drugName: '二甲双胍片 0.5g×60 片（每日 3 次，每次 1 片，口服）', doctor: '孙***（内分泌科副主任医师）', time: '2026-10-20 14:00:00（处方开具时间）' },
    { id: 'TP-004', prescriptionNo: 'RX-2026-10-20-000004', patientName: '刘***（70 岁女性，呼吸内科患者）', drugName: '布地奈德吸入剂 200μg×200 喷（每日 2 次，每次 2 喷，吸入）', doctor: '周***（呼吸内科主治医师）', time: '2026-10-20 15:00:00（处方开具时间）' },
    { id: 'TP-005', prescriptionNo: 'RX-2026-10-20-000005', patientName: '陈***（45 岁男性，普外科患者）', drugName: '头孢克肟片 0.1g×12 片（每日 2 次，每次 1 片，口服）', doctor: '吴***（普外科副主任医师）', time: '2026-10-20 16:00:00（处方开具时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/payments - 在线支付 5 条 */
async function handleTelemedPayments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TMP-001', paymentNo: 'PAY-2026-10-20-000001', patientName: '张***（心内科在线问诊患者）', amount: '50.00 元（在线问诊费）', method: '微信支付（患者通过患者端 APP 微信支付）', status: '已支付（支付时间：2026-10-20 09:30:00）' },
    { id: 'TMP-002', paymentNo: 'PAY-2026-10-20-000002', patientName: '李***（骨科在线问诊患者）', amount: '80.00 元（在线问诊费）', method: '支付宝（患者通过患者端 APP 支付宝支付）', status: '已支付（支付时间：2026-10-20 10:30:00）' },
    { id: 'TMP-003', paymentNo: 'PAY-2026-10-20-000003', patientName: '王***（内分泌科在线问诊患者）', amount: '60.00 元（在线问诊费）', method: '医保支付（患者通过医保个人账户支付）', status: '已支付（支付时间：2026-10-20 14:30:00）' },
    { id: 'TMP-004', paymentNo: 'PAY-2026-10-20-000004', patientName: '刘***（呼吸内科在线问诊患者）', amount: '50.00 元（在线问诊费）', method: '微信支付（患者通过患者端 APP 微信支付）', status: '已支付（支付时间：2026-10-20 15:30:00）' },
    { id: 'TMP-005', paymentNo: 'PAY-2026-10-20-000005', patientName: '陈***（普外科在线问诊患者）', amount: '70.00 元（在线问诊费）', method: '支付宝（患者通过患者端 APP 支付宝支付）', status: '已支付（支付时间：2026-10-20 16:00:00）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/delivery - 药品配送 5 条 */
async function handleTelemedDelivery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TMD-001', deliveryNo: 'DLV-2026-10-20-000001', patientName: '张***（心内科在线购药患者）', drugName: '阿司匹林肠溶片 100mg×30 片（1 盒）', address: '浙江省杭州市西湖区***小区 1 幢 101 室（患者收货地址）', status: '已配送（配送时间：2026-10-20 14:00:00，预计送达：2026-10-21 12:00:00）' },
    { id: 'TMD-002', deliveryNo: 'DLV-2026-10-20-000002', patientName: '李***（骨科在线购药患者）', drugName: '布洛芬缓释胶囊 0.3g×20 粒（1 盒）', address: '浙江省杭州市拱墅区***小区 2 幢 202 室（患者收货地址）', status: '已配送（配送时间：2026-10-20 15:00:00，预计送达：2026-10-21 12:00:00）' },
    { id: 'TMD-003', deliveryNo: 'DLV-2026-10-20-000003', patientName: '王***（内分泌科在线购药患者）', drugName: '二甲双胍片 0.5g×60 片（1 瓶）', address: '浙江省杭州市余杭区***小区 3 幢 303 室（患者收货地址）', status: '已配送（配送时间：2026-10-20 16:00:00，预计送达：2026-10-21 12:00:00）' },
    { id: 'TMD-004', deliveryNo: 'DLV-2026-10-20-000004', patientName: '刘***（呼吸内科在线购药患者）', drugName: '布地奈德吸入剂 200μg×200 喷（1 支）', address: '浙江省杭州市滨江区***小区 4 幢 404 室（患者收货地址）', status: '已配送（配送时间：2026-10-20 17:00:00，预计送达：2026-10-21 12:00:00）' },
    { id: 'TMD-005', deliveryNo: 'DLV-2026-10-20-000005', patientName: '陈***（普外科在线购药患者）', drugName: '头孢克肟片 0.1g×12 片（1 盒）', address: '浙江省杭州市萧山区***小区 5 幢 505 室（患者收货地址）', status: '已配送（配送时间：2026-10-20 18:00:00，预计送达：2026-10-21 12:00:00）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/followup - 在线随访 5 条 */
async function handleTelemedFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TMF-001', followupNo: 'FLW-2026-10-20-000001', patientName: '张***（心内科出院患者）', type: '术后随访（心脏支架术后 1 个月随访）', time: '2026-10-20 09:00:00（随访时间）', result: '患者恢复良好，无胸痛、胸闷等不适，继续服用阿司匹林 100mg/日' },
    { id: 'TMF-002', followupNo: 'FLW-2026-10-20-000002', patientName: '李***（骨科出院患者）', type: '术后随访（骨折术后 2 个月随访）', time: '2026-10-20 10:00:00（随访时间）', result: '患者恢复良好，骨折愈合良好，已可下地行走，继续康复训练' },
    { id: 'TMF-003', followupNo: 'FLW-2026-10-20-000003', patientName: '王***（内分泌科出院患者）', type: '慢病随访（糖尿病出院后 3 个月随访）', time: '2026-10-20 14:00:00（随访时间）', result: '患者血糖控制良好（空腹血糖 6.5 mmol/L），继续服用二甲双胍 0.5g/次、每日 3 次' },
    { id: 'TMF-004', followupNo: 'FLW-2026-10-20-000004', patientName: '刘***（呼吸内科出院患者）', type: '术后随访（肺功能康复 1 个月随访）', time: '2026-10-20 15:00:00（随访时间）', result: '患者恢复良好，肺功能明显改善，继续使用布地奈德吸入剂' },
    { id: 'TMF-005', followupNo: 'FLW-2026-10-20-000005', patientName: '陈***（普外科出院患者）', type: '术后随访（阑尾炎术后 1 个月随访）', time: '2026-10-20 16:00:00（随访时间）', result: '患者恢复良好，伤口愈合良好，无腹痛、发热等不适' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/reports - 互联网医院报告 5 条 */
async function handleTelemedReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TMR-001', reportName: '2026 年 10 月互联网医院运营月度报告', period: '2026-10（本月）', metric: '在线问诊量（1,000 人次）、在线处方量（800 张）、在线支付金额（5 万元）、药品配送量（600 单）', conclusion: '互联网医院运营状况良好，在线问诊量较上月上升 10%，患者满意度达 90 分', time: '2026-10-20（报告生成时间）' },
    { id: 'TMR-002', reportName: '2026 年 Q3 互联网医院运营季度报告', period: '2026-07 至 2026-09（Q3）', metric: '在线问诊量（3,000 人次）、在线处方量（2,400 张）、在线支付金额（15 万元）、药品配送量（1,800 单）', conclusion: '互联网医院运营状况良好，在线问诊量较 Q2 上升 15%，患者满意度达 88 分', time: '2026-10-15（报告生成时间）' },
    { id: 'TMR-003', reportName: '2026 年互联网医院运营年度分析报告', period: '2026-01 至 2026-10（年初至今）', metric: '在线问诊量（9,000 人次）、在线处方量（7,200 张）、在线支付金额（45 万元）、药品配送量（5,400 单）', conclusion: '互联网医院运营状况良好，在线问诊量较去年同期上升 20%，患者满意度达 89 分', time: '2026-10-20（报告生成时间）' },
    { id: 'TMR-004', reportName: '心内科互联网医院专项报告', period: '2026-10（本月）', metric: '心内科在线问诊量（200 人次）、心内科在线处方量（160 张）、心内科药品配送量（120 单）', conclusion: '心内科互联网医院运营状况良好，在线问诊量较上月上升 12%，患者满意度达 92 分', time: '2026-10-20（报告生成时间）' },
    { id: 'TMR-005', reportName: '内分泌科互联网医院专项报告', period: '2026-10（本月）', metric: '内分泌科在线问诊量（150 人次）、内分泌科在线处方量（120 张）、内分泌科药品配送量（90 单）', conclusion: '内分泌科互联网医院运营状况良好，在线问诊量较上月上升 8%，患者满意度达 91 分', time: '2026-10-20（报告生成时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m369Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemed/prescriptions', handle: handleTelemedPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/telemed/payments', handle: handleTelemedPayments, auth: true },
  { method: 'GET', path: '/api/v1/telemed/delivery', handle: handleTelemedDelivery, auth: true },
  { method: 'GET', path: '/api/v1/telemed/followup', handle: handleTelemedFollowup, auth: true },
  { method: 'GET', path: '/api/v1/telemed/reports', handle: handleTelemedReports, auth: true },
];
