/**
 * 健澜科技 jlmedaios - M208 消息通知 + 电子签名 + 数据导出中心
 *
 * 收件箱/公告/待办 + 待签名/已签名 + 导出任务/模板 + 系统参数
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、消息通知中心 ==================== */

/** GET /api/v1/notification/inbox - 用户收件箱 */
async function handleNotificationInbox(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const messages = [
    { id: 'MSG-001', title: '危急值通知：张演示血钾 6.8mmol/L', type: '临床通知', sender: '检验科-王医生', time: '2026-10-20 09:15', read: false, priority: '高' },
    { id: 'MSG-002', title: '请审核本月病历质控报告', type: '审批通知', sender: '质控科-张主任', time: '2026-10-20 08:30', read: false, priority: '中' },
    { id: 'MSG-003', title: '系统升级通知：本周末 22:00-06:00 停机', type: '系统通知', sender: '信息科', time: '2026-10-19 16:00', read: true, priority: '低' },
    { id: 'MSG-004', title: '院感防控培训通知', type: '行政通知', sender: '院感科-李科长', time: '2026-10-19 10:00', read: true, priority: '中' },
    { id: 'MSG-005', title: '新患者入院：心内科一病区 3 床', type: '临床通知', sender: '住院处', time: '2026-10-20 08:00', read: false, priority: '高' },
  ];

  return json(ok({ messages, totalCount: messages.length }));
}

/** GET /api/v1/notification/announcements - 医院公告 */
async function handleNotificationAnnouncements(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const announcements = [
    { id: 'ANN-001', title: '关于开展2026年第三季度医疗质量检查的通知', publisher: '医务处', time: '2026-10-15 09:00', pinned: true, views: 356 },
    { id: 'ANN-002', title: '关于举办护理技能操作比武的通知', publisher: '护理部', time: '2026-10-12 14:00', pinned: false, views: 189 },
    { id: 'ANN-003', title: '关于冬季消防安全演练的通知', publisher: '院办', time: '2026-10-10 10:00', pinned: false, views: 278 },
  ];

  return json(ok({ announcements, totalCount: announcements.length }));
}

/** GET /api/v1/notification/tasks - 待办任务 */
async function handleNotificationTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const tasks = [
    { id: 'TASK-001', name: '审核张演示出院小结', type: '审核', initiator: '李医生', deadline: '2026-10-20 17:00', status: '待处理' },
    { id: 'TASK-002', name: '签署手术同意书（王患者）', type: '签字', initiator: '王医生', deadline: '2026-10-20 15:00', status: '待处理' },
    { id: 'TASK-003', name: '审批本月设备采购申请', type: '审批', initiator: '设备科-赵工', deadline: '2026-10-21 12:00', status: '待处理' },
    { id: 'TASK-004', name: '处理赵患者输血反应上报', type: '处理', initiator: '输血科-孙医生', deadline: '2026-10-19 18:00', status: '已逾期' },
    { id: 'TASK-005', name: '审核本月抗菌药物使用报表', type: '审核', initiator: '药剂科-周主任', deadline: '2026-10-18 17:00', status: '已处理' },
  ];

  return json(ok({ tasks, totalCount: tasks.length }));
}

/* ==================== 二、电子签名与时间戳 ==================== */

/** GET /api/v1/signature/pending - 待签名文件列表 */
async function handleSignaturePending(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const pending = [
    { id: 'SIG-P-001', fileType: '手术同意书', patient: '王患者', submitter: '王医生', submitTime: '2026-10-20 10:00', status: '待患者签' },
    { id: 'SIG-P-002', fileType: '出院小结', patient: '张演示', submitter: '李医生', submitTime: '2026-10-20 09:30', status: '待医生签' },
    { id: 'SIG-P-003', fileType: '知情同意书', patient: '刘患者', submitter: '陈医生', submitTime: '2026-10-20 09:00', status: '待护士签' },
  ];

  return json(ok({ pending, totalCount: pending.length }));
}

/** GET /api/v1/signature/records - 已签名记录 */
async function handleSignatureRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'SIG-R-001', fileName: '张演示入院记录.pdf', signer: '李医生', signTime: '2026-10-15 10:30', method: '手写签名', certSerial: 'SN20261001001' },
    { id: 'SIG-R-002', fileName: '李患者手术记录.pdf', signer: '王主任', signTime: '2026-10-16 14:20', method: '手写签名', certSerial: 'SN20261001002' },
    { id: 'SIG-R-003', fileName: '王患者麻醉同意书.pdf', signer: '王患者', signTime: '2026-10-17 09:00', method: '指纹', certSerial: 'SN20261001003' },
    { id: 'SIG-R-004', fileName: '赵患者出院小结.pdf', signer: '刘医生', signTime: '2026-10-18 16:30', method: '人脸', certSerial: 'SN20261001004' },
    { id: 'SIG-R-005', fileName: '刘患者输血同意书.pdf', signer: '刘患者', signTime: '2026-10-19 11:00', method: '手写签名', certSerial: 'SN20261001005' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/* ==================== 三、数据导出中心 ==================== */

/** GET /api/v1/export/tasks - 导出任务列表 */
async function handleExportTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const tasks = [
    { id: 'EXP-001', content: '患者列表（2026年10月）', format: 'Excel', initiator: '信息科-张工', createTime: '2026-10-20 09:00', status: '处理中', size: null },
    { id: 'EXP-002', content: '检验结果汇总（本月）', format: 'CSV', initiator: '科研科-王医生', createTime: '2026-10-19 15:00', status: '已完成', size: 12.5 },
    { id: 'EXP-003', content: '医嘱明细（近3个月）', format: 'Excel', initiator: '质控科-李主任', createTime: '2026-10-19 10:00', status: '已完成', size: 45.2 },
    { id: 'EXP-004', content: '费用统计（Q3季度）', format: 'PDF', initiator: '财务科-赵科长', createTime: '2026-10-18 14:00', status: '已完成', size: 8.3 },
    { id: 'EXP-005', content: '手术记录导出（全年）', format: 'Excel', initiator: '医务处-孙处长', createTime: '2026-10-17 09:00', status: '失败', size: null },
  ];

  return json(ok({ tasks, totalCount: tasks.length }));
}

/** GET /api/v1/export/templates - 导出模板列表 */
async function handleExportTemplates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const templates = [
    { id: 'TPL-001', name: '科研队列导出模板', scene: '科研', fields: ['患者ID', '诊断', '用药', '检验结果', '随访记录'], updateTime: '2026-09-01' },
    { id: 'TPL-002', name: '质控报表模板', scene: '质控', fields: ['科室', '指标名', '目标值', '实际值', '达标状态'], updateTime: '2026-09-15' },
    { id: 'TPL-003', name: '公卫上报模板', scene: '上报', fields: ['病种', '患者', '诊断时间', '报告时间', '报告人'], updateTime: '2026-10-01' },
  ];

  return json(ok({ templates, totalCount: templates.length }));
}

/* ==================== 四、系统参数 ==================== */

/** GET /api/v1/system/params - 系统参数列表 */
async function handleSystemParams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    hospitalName: '健澜医院',
    address: '浙江省杭州市余杭区健澜路 88 号',
    phone: '0571-8888-8888',
    zipCode: '311100',
    emergencyPhone: '0571-8888-1200',
    logoUrl: '/assets/logo.png',
    level: '三级甲等',
    beds: 1500,
  }));
}

export const m208Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/notification/inbox', handle: handleNotificationInbox, auth: true },
  { method: 'GET', path: '/api/v1/notification/announcements', handle: handleNotificationAnnouncements, auth: true },
  { method: 'GET', path: '/api/v1/notification/tasks', handle: handleNotificationTasks, auth: true },
  { method: 'GET', path: '/api/v1/signature/pending', handle: handleSignaturePending, auth: true },
  { method: 'GET', path: '/api/v1/signature/records', handle: handleSignatureRecords, auth: true },
  { method: 'GET', path: '/api/v1/export/tasks', handle: handleExportTasks, auth: true },
  { method: 'GET', path: '/api/v1/export/templates', handle: handleExportTemplates, auth: true },
  { method: 'GET', path: '/api/v1/system/params', handle: handleSystemParams, auth: true },
];
