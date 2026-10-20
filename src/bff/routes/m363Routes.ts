/**
 * 健澜科技 jlmedaios - M363 P1 业务扩展：智慧服务深度打磨
 *
 * 预约服务/支付服务/查询服务/提醒服务/反馈服务/满意度服务
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/service/appointments - 预约服务 5 条 */
async function handleServiceAppointments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SA-001', appointmentNo: 'APP-2026-10-20-000001', patientName: '张***（65 岁男性）', department: '心内科', doctor: '李***（心内科主治医师）', time: '2026-10-21 09:00:00（预约就诊时间）' },
    { id: 'SA-002', appointmentNo: 'APP-2026-10-20-000002', patientName: '李***（55 岁女性）', department: '骨科', doctor: '赵***（骨科主任医师）', time: '2026-10-21 10:00:00（预约就诊时间）' },
    { id: 'SA-003', appointmentNo: 'APP-2026-10-20-000003', patientName: '王***（60 岁男性）', department: '内分泌科', doctor: '孙***（内分泌科副主任医师）', time: '2026-10-21 14:00:00（预约就诊时间）' },
    { id: 'SA-004', appointmentNo: 'APP-2026-10-20-000004', patientName: '刘***（70 岁女性）', department: '呼吸内科', doctor: '周***（呼吸内科主治医师）', time: '2026-10-22 09:30:00（预约就诊时间）' },
    { id: 'SA-005', appointmentNo: 'APP-2026-10-20-000005', patientName: '陈***（45 岁男性）', department: '普外科', doctor: '吴***（普外科副主任医师）', time: '2026-10-22 15:00:00（预约就诊时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/payments - 支付服务 5 条 */
async function handleServicePayments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SP-001', paymentNo: 'PAY-2026-10-20-000001', patientName: '张***（心内科门诊患者）', amount: '150.00 元（挂号费 + 检查费）', method: '微信支付（患者通过患者端 APP 微信支付）', status: '已支付（支付时间：2026-10-20 09:30:00）' },
    { id: 'SP-002', paymentNo: 'PAY-2026-10-20-000002', patientName: '李***（骨科门诊患者）', amount: '300.00 元（挂号费 + 影像费）', method: '支付宝（患者通过患者端 APP 支付宝支付）', status: '已支付（支付时间：2026-10-20 10:30:00）' },
    { id: 'SP-003', paymentNo: 'PAY-2026-10-20-000003', patientName: '王***（内分泌科住院患者）', amount: '5,000.00 元（住院押金）', method: '医保支付（患者通过医保个人账户支付）', status: '已支付（支付时间：2026-10-20 14:30:00）' },
    { id: 'SP-004', paymentNo: 'PAY-2026-10-20-000004', patientName: '刘***（呼吸内科住院患者）', amount: '8,000.00 元（住院押金）', method: '银行卡支付（患者通过窗口刷银行卡支付）', status: '已支付（支付时间：2026-10-20 15:30:00）' },
    { id: 'SP-005', paymentNo: 'PAY-2026-10-20-000005', patientName: '陈***（普外科门诊患者）', amount: '200.00 元（挂号费 + 手术预约费）', method: '现金支付（患者在窗口现金支付）', status: '已支付（支付时间：2026-10-20 16:00:00）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/querys - 查询服务 5 条 */
async function handleServiceQuerys(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SQ-001', queryNo: 'QUERY-2026-10-20-000001', patientName: '张***（心内科门诊患者）', type: '检验结果查询（血常规报告）', time: '2026-10-20 09:00:00（查询时间）', result: '已查询（血常规报告已出，白细胞 6.5×10⁹/L、血红蛋白 130 g/L）' },
    { id: 'SQ-002', queryNo: 'QUERY-2026-10-20-000002', patientName: '李***（骨科门诊患者）', type: '影像结果查询（X光片报告）', time: '2026-10-20 10:00:00（查询时间）', result: '已查询（X光片报告已出，未见明显骨折征象）' },
    { id: 'SQ-003', queryNo: 'QUERY-2026-10-20-000003', patientName: '王***（内分泌科住院患者）', type: '住院费用查询（住院押金余额）', time: '2026-10-20 14:00:00（查询时间）', result: '已查询（住院押金余额 3,500.00 元，已使用 1,500.00 元）' },
    { id: 'SQ-004', queryNo: 'QUERY-2026-10-20-000004', patientName: '刘***（呼吸内科住院患者）', type: '病历查询（出院小结）', time: '2026-10-20 15:00:00（查询时间）', result: '已查询（出院小结已出，出院诊断：慢性阻塞性肺疾病急性加重）' },
    { id: 'SQ-005', queryNo: 'QUERY-2026-10-20-000005', patientName: '陈***（普外科门诊患者）', type: '报告查询（病理报告）', time: '2026-10-20 16:00:00（查询时间）', result: '已查询（病理报告已出，诊断：急性阑尾炎）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/reminders - 提醒服务 5 条 */
async function handleServiceReminders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SR-001', reminderNo: 'REMINDER-2026-10-20-000001', patientName: '张***（心内科预约患者）', type: '预约就诊提醒', time: '2026-10-21 08:00:00（提醒发送时间，就诊前 1 小时）', status: '已发送（通过患者端 APP 推送 + 短信提醒）' },
    { id: 'SR-002', reminderNo: 'REMINDER-2026-10-20-000002', patientName: '李***（骨科检查患者）', type: '检查前准备提醒', time: '2026-10-21 09:00:00（提醒发送时间，检查前 1 小时）', status: '已发送（通过患者端 APP 推送：请空腹、携带身份证）' },
    { id: 'SR-003', reminderNo: 'REMINDER-2026-10-20-000003', patientName: '王***（内分泌科住院患者）', type: '服药提醒', time: '2026-10-20 14:00:00（提醒发送时间，服药前 30 分钟）', status: '已发送（通过患者端 APP 推送：请服用二甲双胍 0.5g）' },
    { id: 'SR-004', reminderNo: 'REMINDER-2026-10-20-000004', patientName: '刘***（呼吸内科住院患者）', type: '复查提醒', time: '2026-10-20 15:00:00（提醒发送时间，出院前 1 天）', status: '已发送（通过患者端 APP 推送：请按时回院复查肺功能）' },
    { id: 'SR-005', reminderNo: 'REMINDER-2026-10-20-000005', patientName: '陈***（普外科手术患者）', type: '手术前注意事项提醒', time: '2026-10-22 08:00:00（提醒发送时间，手术前 1 天）', status: '已发送（通过患者端 APP 推送：请空腹 8 小时、携带术前检查报告）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/feedback - 反馈服务 5 条 */
async function handleServiceFeedback(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SF-001', feedbackNo: 'FEEDBACK-2026-10-20-000001', patientName: '张***（心内科门诊患者）', type: '服务好评', content: '李医生态度很好，耐心解释了我的病情，非常感谢！', time: '2026-10-20 09:30:00（反馈时间）' },
    { id: 'SF-002', feedbackNo: 'FEEDBACK-2026-10-20-000002', patientName: '李***（骨科门诊患者）', type: '服务建议', content: '建议增加骨科门诊号源，我预约了 3 天才预约到', time: '2026-10-20 10:30:00（反馈时间）' },
    { id: 'SF-003', feedbackNo: 'FEEDBACK-2026-10-20-000003', patientName: '王***（内分泌科住院患者）', type: '服务投诉', content: '住院费用查询不太方便，希望能在患者端 APP 上实时查看费用明细', time: '2026-10-20 14:30:00（反馈时间）' },
    { id: 'SF-004', feedbackNo: 'FEEDBACK-2026-10-20-000004', patientName: '刘***（呼吸内科住院患者）', type: '服务好评', content: '呼吸内科护士护理很细心，每天都来询问我的病情，非常满意！', time: '2026-10-20 15:30:00（反馈时间）' },
    { id: 'SF-005', feedbackNo: 'FEEDBACK-2026-10-20-000005', patientName: '陈***（普外科门诊患者）', type: '服务建议', content: '建议增加患者端 APP 的病理报告推送功能，不用每天手动查询', time: '2026-10-20 16:00:00（反馈时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/satisfaction - 满意度服务 5 条 */
async function handleServiceSatisfaction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SS-001', patientName: '张***（心内科门诊患者）', department: '心内科', score: '95 分（百分制）', review: '李医生态度很好，耐心解释了我的病情，非常满意！', time: '2026-10-20 09:30:00（评价时间）' },
    { id: 'SS-002', patientName: '李***（骨科门诊患者）', department: '骨科', score: '85 分（百分制）', review: '赵医生技术很好，但门诊等待时间太长（等了 2 小时）', time: '2026-10-20 10:30:00（评价时间）' },
    { id: 'SS-003', patientName: '王***（内分泌科住院患者）', department: '内分泌科', score: '90 分（百分制）', review: '住院环境很好，但费用查询不太方便', time: '2026-10-20 14:30:00（评价时间）' },
    { id: 'SS-004', patientName: '刘***（呼吸内科住院患者）', department: '呼吸内科', score: '98 分（百分制）', review: '护士护理很细心，每天都来询问我的病情，非常满意！', time: '2026-10-20 15:30:00（评价时间）' },
    { id: 'SS-005', patientName: '陈***（普外科门诊患者）', department: '普外科', score: '88 分（百分制）', review: '吴医生技术很好，但病理报告推送功能不够完善', time: '2026-10-20 16:00:00（评价时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m363Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/service/appointments', handle: handleServiceAppointments, auth: true },
  { method: 'GET', path: '/api/v1/service/payments', handle: handleServicePayments, auth: true },
  { method: 'GET', path: '/api/v1/service/querys', handle: handleServiceQuerys, auth: true },
  { method: 'GET', path: '/api/v1/service/reminders', handle: handleServiceReminders, auth: true },
  { method: 'GET', path: '/api/v1/service/feedback', handle: handleServiceFeedback, auth: true },
  { method: 'GET', path: '/api/v1/service/satisfaction', handle: handleServiceSatisfaction, auth: true },
];
