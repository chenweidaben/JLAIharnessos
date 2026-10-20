/**
 * 健澜科技 jlmedaios - M415 P1 业务扩展：智慧服务深度打磨（详情版）
 *
 * 预约挂号详情/排队叫号详情/移动支付详情/报告查询详情/消息通知详情/意见反馈详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/service/appointments-detail - 预约挂号详情 5 条 */
async function handleServiceAppointmentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAD-001', appointmentNo: 'APT-2026-001（心内科门诊预约）', patient: '患者：张***（男，65 岁，医保类型：职工医保）', department: '科室：心内科（门诊 3 楼 5 诊室）', doctor: '医生：王***（主治医师，心血管内科）', time: '预约时间：2026-10-21 09:00:00（上午第 3 号）' },
    { id: 'SAD-002', appointmentNo: 'APT-2026-002（神经内科门诊预约）', patient: '患者：李***（女，58 岁，医保类型：居民医保）', department: '科室：神经内科（门诊 2 楼 3 诊室）', doctor: '医生：赵***（副主任医师，脑血管病）', time: '预约时间：2026-10-21 10:30:00（上午第 5 号）' },
    { id: 'SAD-003', appointmentNo: 'APT-2026-003（骨科门诊预约）', patient: '患者：王***（男，72 岁，医保类型：职工医保）', department: '科室：骨科（门诊 4 楼 2 诊室）', doctor: '医生：钱***（主任医师，关节外科）', time: '预约时间：2026-10-22 14:00:00（下午第 2 号）' },
    { id: 'SAD-004', appointmentNo: 'APT-2026-004（儿科门诊预约）', patient: '患者：陈***（女，5 岁，医保类型：居民医保）', department: '科室：儿科（门诊 1 楼 8 诊室）', doctor: '医生：孙***（主治医师，小儿呼吸）', time: '预约时间：2026-10-22 15:30:00（下午第 6 号）' },
    { id: 'SAD-005', appointmentNo: 'APT-2026-005（妇产科门诊预约）', patient: '患者：赵***（女，32 岁，医保类型：职工医保）', department: '科室：妇产科（门诊 3 楼 8 诊室）', doctor: '医生：周***（副主任医师，围产医学）', time: '预约时间：2026-10-23 08:30:00（上午第 1 号）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/queues-detail - 排队叫号详情 5 条 */
async function handleServiceQueuesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SQD-001', patient: '患者：张***（男，65 岁）', department: '科室：心内科门诊（3 楼 5 诊室，王***医生）', queueNo: '候诊号：A015（当前叫号 A012，前方 3 人）', callStatus: '叫号状态：等待中（预计等待 15 分钟）', time: '时间：2026-10-20 09:15:00（到院签到时间）' },
    { id: 'SQD-002', patient: '患者：李***（女，58 岁）', department: '科室：神经内科门诊（2 楼 3 诊室，赵***医生）', queueNo: '候诊号：B008（当前叫号 B005，前方 3 人）', callStatus: '叫号状态：等待中（预计等待 20 分钟）', time: '时间：2026-10-20 10:00:00（到院签到时间）' },
    { id: 'SQD-003', patient: '患者：王***（男，72 岁）', department: '科室：骨科门诊（4 楼 2 诊室，钱***医生）', queueNo: '候诊号：C003（当前叫号 C002，前方 1 人）', callStatus: '叫号状态：即将叫到（预计等待 5 分钟）', time: '时间：2026-10-20 14:10:00（到院签到时间）' },
    { id: 'SQD-004', patient: '患者：陈***（女，5 岁）', department: '科室：儿科门诊（1 楼 8 诊室，孙***医生）', queueNo: '候诊号：D020（当前叫号 D015，前方 5 人）', callStatus: '叫号状态：等待中（预计等待 25 分钟）', time: '时间：2026-10-20 15:00:00（到院签到时间）' },
    { id: 'SQD-005', patient: '患者：赵***（女，32 岁）', department: '科室：妇产科门诊（3 楼 8 诊室，周***医生）', queueNo: '候诊号：E001（当前叫号 E001，已叫号）', callStatus: '叫号状态：已叫号（请立即到诊室就诊）', time: '时间：2026-10-20 08:25:00（到院签到时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/payments-detail - 移动支付详情 5 条 */
async function handleServicePaymentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPD-001', paymentNo: 'PAY-2026-001（门诊挂号费支付）', patient: '患者：张***（男，65 岁）', amount: '金额：25.00 元（心内科普通门诊挂号费）', method: '支付方式：微信支付（医保个人账户扣款）', status: '状态：已支付（支付时间：2026-10-20 08:50:00）' },
    { id: 'SPD-002', paymentNo: 'PAY-2026-002（门诊检查费支付）', patient: '患者：李***（女，58 岁）', amount: '金额：350.00 元（头颅 MRI 平扫检查费）', method: '支付方式：支付宝（医保统筹支付 280.00 元，自付 70.00 元）', status: '状态：已支付（支付时间：2026-10-20 10:15:00）' },
    { id: 'SPD-003', paymentNo: 'PAY-2026-003（门诊药费支付）', patient: '患者：王***（男，72 岁）', amount: '金额：186.50 元（阿托伐他汀钙片+碳酸钙 D3 片）', method: '支付方式：微信支付（医保个人账户扣款）', status: '状态：已支付（支付时间：2026-10-20 14:30:00）' },
    { id: 'SPD-004', paymentNo: 'PAY-2026-004（住院押金支付）', patient: '患者：陈***（男，45 岁，普外科）', amount: '金额：5000.00 元（住院押金）', method: '支付方式：银行卡支付（工行储蓄卡）', status: '状态：已支付（支付时间：2026-10-19 16:00:00）' },
    { id: 'SPD-005', paymentNo: 'PAY-2026-005（门诊检验费支付）', patient: '患者：赵***（女，32 岁）', amount: '金额：120.00 元（血常规+尿常规+肝功能）', method: '支付方式：微信支付（医保统筹支付 96.00 元，自付 24.00 元）', status: '状态：已支付（支付时间：2026-10-20 08:40:00）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/reports-detail - 报告查询详情 5 条 */
async function handleServiceReportsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRD-001', reportNo: 'RPT-2026-001（血常规报告）', patient: '患者：赵***（女，32 岁）', project: '项目：血常规（白细胞、红细胞、血红蛋白、血小板等 18 项）', result: '结果：白细胞 6.5×10⁹/L（正常）；红细胞 4.5×10¹²/L（正常）；血红蛋白 130 g/L（正常）；血小板 200×10⁹/L（正常）', time: '时间：2026-10-20 09:00:00（报告出具时间）' },
    { id: 'SRD-002', reportNo: 'RPT-2026-002（头颅 MRI 报告）', patient: '患者：李***（女,58 岁）', project: '项目：头颅 MRI 平扫（颅脑）', result: '结果：右侧基底节区腔隙性脑梗死（陈旧性）；脑白质疏松（轻度）；未见急性出血或占位性病变', time: '时间：2026-10-20 14:00:00（报告出具时间）' },
    { id: 'SRD-003', reportNo: 'RPT-2026-003（心电图报告）', patient: '患者：张***（男，65 岁）', project: '项目：常规 12 导联心电图', result: '结果：窦性心律；心率 75 次/分；ST-T 段改变（V4-V6 导联 ST 段压低 0.1mV）；提示心肌缺血可能', time: '时间：2026-10-20 09:20:00（报告出具时间）' },
    { id: 'SRD-004', reportNo: 'RPT-2026-004（肝功能报告）', patient: '患者：王***（男，72 岁）', project: '项目：肝功能（ALT、AST、总胆红素、直接胆红素、白蛋白等 12 项）', result: '结果：ALT 35 U/L（正常）；AST 30 U/L（正常）；总胆红素 15 μmol/L（正常）；白蛋白 40 g/L（正常）', time: '时间：2026-10-20 15:00:00（报告出具时间）' },
    { id: 'SRD-005', reportNo: 'RPT-2026-005（尿常规报告）', patient: '患者：陈***（女，5 岁）', project: '项目：尿常规（尿蛋白、尿糖、尿潜血、白细胞等 10 项）', result: '结果：尿蛋白（-）；尿糖（-）；尿潜血（-）；白细胞（+）；提示尿路感染可能', time: '时间：2026-10-20 16:00:00（报告出具时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/messages-detail - 消息通知详情 5 条 */
async function handleServiceMessagesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SMD-001', messageNo: 'MSG-2026-001（预约成功通知）', msgType: '类型：预约成功（APPOINTMENT_CONFIRM）', receiver: '接收人：张***（患者，手机 138****5678）', content: '内容：您已成功预约 2026-10-21 09:00 心内科门诊（王***医生），请提前 15 分钟到院签到。', time: '时间：2026-10-20 08:50:00（发送时间）' },
    { id: 'SMD-002', messageNo: 'MSG-2026-002（叫号提醒）', msgType: '类型：叫号提醒（QUEUE_CALL）', receiver: '接收人：赵***（患者，手机 139****1234）', content: '内容：您的候诊号 E001 已叫号，请立即到 3 楼 8 诊室就诊（妇产科周***医生）。', time: '时间：2026-10-20 08:25:00（发送时间）' },
    { id: 'SMD-003', messageNo: 'MSG-2026-003（报告出具通知）', msgType: '类型：报告出具（REPORT_READY）', receiver: '接收人：李***（患者，手机 137****5678）', content: '内容：您的头颅 MRI 报告已出具，可在手机端查询或到门诊 2 楼报告打印机取报告。', time: '时间：2026-10-20 14:00:00（发送时间）' },
    { id: 'SMD-004', messageNo: 'MSG-2026-004（缴费提醒）', msgType: '类型：缴费提醒（PAYMENT_REMINDER）', receiver: '接收人：王***（患者，手机 136****7890）', content: '内容：您有一笔门诊药费 186.50 元待支付，请在 30 分钟内完成支付，超时将自动取消处方。', time: '时间：2026-10-20 14:25:00（发送时间）' },
    { id: 'SMD-005', messageNo: 'MSG-2026-005（随访提醒）', msgType: '类型：随访提醒（FOLLOWUP_REMINDER）', receiver: '接收人：陈***（患儿家长，手机 135****3456）', content: '内容：您的孩子（陈***）已出院 7 天，请于 2026-10-23 到儿科门诊复诊（孙***医生）。', time: '时间：2026-10-20 09:00:00（发送时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/feedback-detail - 意见反馈详情 5 条 */
async function handleServiceFeedbackDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SFD-001', feedbackNo: 'FBK-2026-001（门诊服务投诉）', patient: '患者：张***（男，65 岁）', feedbackType: '类型：投诉（COMPLAINT）', content: '内容：心内科门诊候诊时间过长（等待 40 分钟），诊室叫号系统不准确，希望改进。', handleStatus: '处理状态：已处理（2026-10-20 11:00:00 门诊办主任回复：已增加出诊医生，优化叫号系统，致歉）' },
    { id: 'SFD-002', feedbackNo: 'FBK-2026-002（住院服务表扬）', patient: '患者：李***（女，58 岁）', feedbackType: '类型：表扬（PRAISE）', content: '内容：神经内科病房护士护理服务非常周到，特别是责任护士刘***，耐心细致，感谢！', handleStatus: '处理状态：已处理（2026-10-20 10:00:00 护理部回复：已将表扬转达刘***护士，全院通报表扬）' },
    { id: 'SFD-003', feedbackNo: 'FBK-2026-003（药房服务建议）', patient: '患者：王***（男，72 岁）', feedbackType: '类型：建议（SUGGESTION）', content: '内容：门诊药房取药排队时间较长（等待 20 分钟），建议增加发药窗口或优化处方审核流程。', handleStatus: '处理状态：处理中（2026-10-20 14:00:00 药剂科回复：已记录建议，将评估增加窗口的可行性）' },
    { id: 'SFD-004', feedbackNo: 'FBK-2026-004（移动支付问题）', patient: '患者：赵***（女，32 岁）', feedbackType: '类型：问题咨询（INQUIRY）', content: '内容：微信支付时提示"支付失败"，但银行卡已扣款，如何退款？', handleStatus: '处理状态：已处理（2026-10-20 09:30:00 财务科回复：已核实，退款将在 3 个工作日内原路退回）' },
    { id: 'SFD-005', feedbackNo: 'FBK-2026-005（停车服务投诉）', patient: '患者：陈***（男，45 岁）', feedbackType: '类型：投诉（COMPLAINT）', content: '内容：医院停车场车位紧张，就诊 2 小时仍找不到车位，建议增加停车场或引导至周边停车场。', handleStatus: '处理状态：处理中（2026-10-20 16:00:00 后勤科回复：已记录投诉，将评估扩建停车场的可行性）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m415Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/service/appointments-detail', handle: handleServiceAppointmentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/service/queues-detail', handle: handleServiceQueuesDetail, auth: true },
  { method: 'GET', path: '/api/v1/service/payments-detail', handle: handleServicePaymentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/service/reports-detail', handle: handleServiceReportsDetail, auth: true },
  { method: 'GET', path: '/api/v1/service/messages-detail', handle: handleServiceMessagesDetail, auth: true },
  { method: 'GET', path: '/api/v1/service/feedback-detail', handle: handleServiceFeedbackDetail, auth: true },
];
