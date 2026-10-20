/**
 * 健澜科技 jlmedaios - M234 互联网医院/智慧服务深度
 *
 * 互联网处方/互联网支付/智慧排队/智慧缴费
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、互联网医院 ==================== */

/** GET /api/v1/internet/prescriptions - 互联网处方 */
async function handleInternetPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const prescriptions = [
    { id: 'NET-RX-001', rxNo: 'RX20261020001', patient: '张演示', doctor: '李医生-心内科', diagnosis: '冠心病（稳定型心绞痛）', medicines: ['阿司匹林肠溶片 100mg qd', '阿托伐他汀钙片 20mg qn'], status: '已审核', pharmacy: '线上药房', createTime: '2026-10-20 09:30' },
    { id: 'NET-RX-002', patient: '王女士', doctor: '赵医生-呼吸科', diagnosis: '急性支气管炎', medicines: ['头孢克肟胶囊 0.2g bid', '氨溴索口服液 10ml tid'], status: '已发药', pharmacy: '线上药房', createTime: '2026-10-20 10:15' },
    { id: 'NET-RX-003', patient: '刘大爷', doctor: '陈医生-内分泌科', diagnosis: '2 型糖尿病', medicines: ['二甲双胍缓释片 0.5g bid'], status: '配送中', pharmacy: '同城配送', createTime: '2026-10-20 11:00' },
  ];

  return json(ok({ prescriptions, totalCount: prescriptions.length }));
}

/** GET /api/v1/internet/payments - 互联网支付 */
async function handleInternetPayments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const payments = [
    { id: 'NET-PAY-001', orderNo: 'PAY20261020001', patient: '张演示', amount: 158.50, items: ['问诊费 50 元', '药品费 108.50 元'], paymentMethod: '微信支付', status: '已支付', payTime: '2026-10-20 09:35' },
    { id: 'NET-PAY-002', patient: '王女士', amount: 86.00, items: ['问诊费 30 元', '药品费 56.00 元'], paymentMethod: '支付宝', status: '已支付', payTime: '2026-10-20 10:20' },
    { id: 'NET-PAY-003', patient: '刘大爷', amount: 45.00, items: ['问诊费 45.00 元'], paymentMethod: '医保电子凭证', status: '已退款', payTime: '2026-10-20 11:05' },
  ];

  return json(ok({ payments, totalCount: payments.length }));
}

/* ==================== 二、智慧服务 ==================== */

/** GET /api/v1/smart-service/queue - 智慧排队 */
async function handleSmartServiceQueue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const queues = [
    { id: 'QUEUE-001', dept: '心内科', window: '3 号诊室', currentNo: 'A015', myNo: 'A023', waitingCount: 8, estimatedWait: 20 },
    { id: 'QUEUE-002', dept: '呼吸科', window: '5 号诊室', currentNo: 'B008', myNo: 'B012', waitingCount: 4, estimatedWait: 10 },
    { id: 'QUEUE-003', dept: '检验科', window: '2 号窗口', currentNo: 'C032', myNo: 'C045', waitingCount: 13, estimatedWait: 30 },
    { id: 'QUEUE-004', dept: '药房', window: '1 号窗口', currentNo: 'D056', myNo: 'D058', waitingCount: 2, estimatedWait: 5 },
  ];

  return json(ok({ queues, totalCount: queues.length }));
}

/** GET /api/v1/smart-service/payment - 智慧缴费 */
async function handleSmartServicePayment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const payments = [
    { id: 'SMART-PAY-001', orderNo: 'FEE20261020001', patient: '张演示', amount: 320.00, items: ['挂号费 25 元', '心电图检查 60 元', '心肌酶谱 235 元'], paymentMethod: '微信支付', status: '已支付', payTime: '2026-10-20 08:45' },
    { id: 'SMART-PAY-002', patient: '王女士', amount: 156.80, items: ['挂号费 25 元', '胸部 CT 131.80 元'], paymentMethod: '支付宝', status: '已支付', payTime: '2026-10-20 09:15' },
    { id: 'SMART-PAY-003', patient: '刘大爷', amount: 89.50, items: ['挂号费 25 元', '血糖检测 64.50 元'], paymentMethod: '医保电子凭证', status: '待支付', payTime: null },
  ];

  return json(ok({ payments, totalCount: payments.length }));
}

export const m234Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/internet/prescriptions', handle: handleInternetPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/internet/payments', handle: handleInternetPayments, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/queue', handle: handleSmartServiceQueue, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/payment', handle: handleSmartServicePayment, auth: true },
];
