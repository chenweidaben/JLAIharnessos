/**
 * 健澜科技 jlmedaios - M317 角色工作流域
 *
 * 医生/护士/药师/药师/行政工作台任务 + 工作流队列/历史
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/doctor-tasks - 医生工作台任务 5 条 */
async function handleWorkflowDoctorTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DT-001', taskNo: 'TASK-20261020-001', type: '待查房患者', patient: '王***（心内科 3 床）', priority: '高（新入院）', status: '待处理' },
    { id: 'DT-002', taskNo: 'TASK-20261020-002', type: '病历书写', patient: '李***（心内科 5 床，术后第 2 天）', priority: '中（24 小时内完成）', status: '待处理' },
    { id: 'DT-003', taskNo: 'TASK-20261020-003', type: '检验危急值', patient: '张***（心内科 8 床，血钾 6.8 mmol/L）', priority: '紧急（立即处理）', status: '已处理' },
    { id: 'DT-004', taskNo: 'TASK-20261020-004', type: '会诊邀请', patient: '赵***（心内科 10 床，申请内分泌科会诊）', priority: '中（48 小时内响应）', status: '待处理' },
    { id: 'DT-005', taskNo: 'TASK-20261020-005', type: '出院评估', patient: '孙***（心内科 12 床，住院第 7 天，病情稳定）', priority: '低（本周内完成）', status: '已完成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/nurse-tasks - 护士工作台任务 5 条 */
async function handleWorkflowNurseTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NT-001', taskNo: 'TASK-20261020-001', type: '生命体征监测', patient: '王***（心内科 3 床，术后第 1 天）', priority: '高（每 2 小时一次）', status: '执行中' },
    { id: 'NT-002', taskNo: 'TASK-20261020-002', type: '静脉输液', patient: '李***（心内科 5 床，硝酸甘油 5mg + 5%GS 250ml）', priority: '高（30 分钟内开始）', status: '待处理' },
    { id: 'NT-003', taskNo: 'TASK-20261020-003', type: '药物发放', patient: '张***（心内科 8 床，口服药：阿司匹林+美托洛尔）', priority: '中（08:00 前完成）', status: '已完成' },
    { id: 'NT-004', taskNo: 'TASK-20261020-004', type: '伤口换药', patient: '赵***（心内科 10 床，术后切口清洁换药）', priority: '中（每日一次）', status: '待处理' },
    { id: 'NT-005', taskNo: 'TASK-20261020-005', type: '入院宣教', patient: '孙***（心内科 12 床，新入院患者宣教）', priority: '低（入院 24 小时内）', status: '已完成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/pharmacist-tasks - 药师工作台任务 5 条 */
async function handleWorkflowPharmacistTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PT-001', taskNo: 'TASK-20261020-001', type: '处方审核', drug: '阿司匹林肠溶片 100mg×30 片（心内科 12 张处方）', priority: '高（30 分钟内完成）', status: '待处理' },
    { id: 'PT-002', taskNo: 'TASK-20261020-002', type: '用药干预', drug: '华法林 2.5mg（患者 INR 3.5，超治疗范围）', priority: '紧急（立即联系医生）', status: '已处理' },
    { id: 'PT-003', taskNo: 'TASK-20261020-003', type: '药品调配', drug: '心内科口服药（08:00 批次，共 35 份）', priority: '高（07:30 前完成）', status: '已完成' },
    { id: 'PT-004', taskNo: 'TASK-20261020-004', type: '特殊药品管理', drug: '麻醉药品（哌替啶注射液，空安瓿回收 2 支）', priority: '高（双人核对）', status: '执行中' },
    { id: 'PT-005', taskNo: 'TASK-20261020-005', type: '药品盘点', drug: '药房库存盘点（月度盘点，覆盖 1,200 个品规）', priority: '低（本周五前完成）', status: '待处理' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/admin-tasks - 行政工作台任务 5 条 */
async function handleWorkflowAdminTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AT-001', taskNo: 'TASK-20261020-001', type: '会议安排', department: '医务科（下周医疗质量例会，参会 25 人）', priority: '中（本周三前完成）', status: '待处理' },
    { id: 'AT-002', taskNo: 'TASK-20261020-002', type: '审批流程', department: '人事科（新员工入职审批 3 人）', priority: '高（24 小时内完成）', status: '已处理' },
    { id: 'AT-003', taskNo: 'TASK-20261020-003', type: '文件起草', department: '院办（三季度工作总结报告）', priority: '中（下周一前提交）', status: '执行中' },
    { id: 'AT-004', taskNo: 'TASK-20261020-004', type: '数据上报', department: '统计科（月度医疗数据上报卫健委）', priority: '高（每月 5 日前）', status: '已完成' },
    { id: 'AT-005', taskNo: 'TASK-20261020-005', type: '后勤协调', department: '总务处（住院部空调维修协调）', priority: '低（3 日内安排）', status: '待处理' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/queue - 工作流队列 5 条 */
async function handleWorkflowQueue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WQ-001', queueNo: 'Q-20261020-001', node: '门诊叫号队列（内科诊室 3）', handler: '内科 王***主任医师', waitTime: '当前等待 8 人，平均等待 12 分钟', status: '运行中' },
    { id: 'WQ-002', queueNo: 'Q-20261020-002', node: '住院病历审核队列（出院病历）', handler: '病案室 李***主管技师', waitTime: '积压 25 份，平均等待 3 天', status: '积压中' },
    { id: 'WQ-003', queueNo: 'Q-20261020-003', node: '医保结算队列（出院结算窗口）', handler: '医保办 张***副主任', waitTime: '当前等待 15 人，平均等待 20 分钟', status: '运行中' },
    { id: 'WQ-004', queueNo: 'Q-20261020-004', node: '检验报告审核队列（生化标本）', handler: '检验科 赵***主管技师', waitTime: '当前积压 50 份，平均等待 4 小时', status: '正常' },
    { id: 'WQ-005', queueNo: 'Q-20261020-005', node: '手术排程队列（明日手术安排）', handler: '手术室 孙***护士长', waitTime: '明日排台 12 台，已确认 10 台', status: '排台中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/history - 工作流历史 5 条 */
async function handleWorkflowHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WH-001', processNo: 'PROC-20261018-001', node: '入院登记→分配床位→主管医生', operator: '住院处 周***', time: '2026-10-18 09:30', result: '成功（心内科 3 床，王***主任医师主管）' },
    { id: 'WH-002', processNo: 'PROC-20261018-002', node: '医嘱开立→药房审核→药品调配→发药', operator: '心内科 李***主治医师 / 药房 吴***药师', time: '2026-10-18 10:15', result: '成功（口服药 5 种，已按时发放）' },
    { id: 'WH-003', processNo: 'PROC-20261019-003', node: '手术申请→术前评估→排台→手术→术后观察', operator: '外科 郑***主任医师 / 手术室 王***护士长', time: '2026-10-19 08:00', result: '成功（腹腔镜胆囊切除术，手术时长 1 小时 20 分）' },
    { id: 'WH-004', processNo: 'PROC-20261019-004', node: '检验申请→标本采集→送检→报告审核→发布', operator: '检验科 陈***主管技师', time: '2026-10-19 11:00', result: '成功（血常规+生化，报告已发布至 HIS）' },
    { id: 'WH-005', processNo: 'PROC-20261020-005', node: '出院评估→出院结算→医保审核→病案归档', operator: '医保办 王*** / 病案室 李***', time: '2026-10-20 09:00', result: '成功（住院 7 天，总费用 8,500 元，医保报销 6,800 元）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m317Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/doctor-tasks', handle: handleWorkflowDoctorTasks, auth: true },
  { method: 'GET', path: '/api/v1/workflow/nurse-tasks', handle: handleWorkflowNurseTasks, auth: true },
  { method: 'GET', path: '/api/v1/workflow/pharmacist-tasks', handle: handleWorkflowPharmacistTasks, auth: true },
  { method: 'GET', path: '/api/v1/workflow/admin-tasks', handle: handleWorkflowAdminTasks, auth: true },
  { method: 'GET', path: '/api/v1/workflow/queue', handle: handleWorkflowQueue, auth: true },
  { method: 'GET', path: '/api/v1/workflow/history', handle: handleWorkflowHistory, auth: true },
];
