/**
 * 健澜科技 jlmedaios - M342 工作流 + 任务调度域
 *
 * 工作流任务/模板 + 待办/已办/逾期任务（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/tasks - 工作流任务 5 条 */
async function handleWorkflowTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WT-001', taskNo: 'TASK-2026-000001', type: '病历审核任务', handler: '李***（心内科主治医师）', priority: '中级（常规病历审核）', status: '处理中（已审核 5/10 份病历）' },
    { id: 'WT-002', taskNo: 'TASK-2026-000002', type: '处方审核任务', handler: '王***（主管药师）', priority: '高级（含抗生素处方，需重点审核）', status: '待处理（今日待审核处方 20 张）' },
    { id: 'WT-003', taskNo: 'TASK-2026-000003', type: '会诊申请任务', handler: '赵***（骨科主任医师）', priority: '高级（急诊会诊，需 30 分钟内响应）', status: '已完成（已完成会诊，出具会诊意见）' },
    { id: 'WT-004', taskNo: 'TASK-2026-000004', type: '出院审核任务', handler: '周***（普外科副主任医师）', priority: '中级（常规出院审核）', status: '处理中（已审核 3/5 份出院病历）' },
    { id: 'WT-005', taskNo: 'TASK-2026-000005', type: '检查报告审核任务', handler: '郑***（影像科主任医师）', priority: '中级（常规影像报告审核）', status: '待处理（今日待审核报告 15 份）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/templates - 工作流模板 5 条 */
async function handleWorkflowTemplates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WT-001', templateName: '入院流程模板', type: '患者入院', nodeCount: '8 个节点（挂号→分诊→接诊→开检查→缴费→检查→诊断→入院）', status: '启用中（已运行 3 年，累计执行 50,000+ 次）', updateTime: '2023-01-01（最近更新：2025-06-15）' },
    { id: 'WT-002', templateName: '手术流程模板', type: '患者手术', nodeCount: '12 个节点（术前讨论→签字→备血→麻醉→手术→苏醒→术后观察→出院）', status: '启用中（已运行 5 年，累计执行 10,000+ 次）', updateTime: '2021-03-15（最近更新：2025-08-20）' },
    { id: 'WT-003', templateName: '出院流程模板', type: '患者出院', nodeCount: '6 个节点（出院评估→开出院医嘱→结算→出院指导→随访登记→病历归档）', status: '启用中（已运行 3 年，累计执行 45,000+ 次）', updateTime: '2023-05-20（最近更新：2025-07-10）' },
    { id: 'WT-004', templateName: '会诊申请流程模板', type: '科室间会诊', nodeCount: '5 个节点（提交申请→科室审核→会诊医生指派→会诊执行→出具会诊意见）', status: '启用中（已运行 4 年，累计执行 8,000+ 次）', updateTime: '2022-09-10（最近更新：2025-05-05）' },
    { id: 'WT-005', templateName: '处方审核流程模板', type: '处方审核', nodeCount: '4 个节点（处方开具→药师审核→药房调配→患者取药）', status: '启用中（已运行 5 年，累计执行 100,000+ 次）', updateTime: '2021-01-01（最近更新：2025-09-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tasks/todo - 待办任务 5 条 */
async function handleTasksTodo(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TT-001', taskNo: 'TODO-2026-000001', type: '病历审核', content: '审核心内科今日新入院患者病历 10 份', deadline: '2026-10-20 17:00:00（今日下班前）', priority: '中级' },
    { id: 'TT-002', taskNo: 'TODO-2026-000002', type: '处方审核', content: '审核今日门诊处方 20 张（含抗生素处方 5 张）', deadline: '2026-10-20 12:00:00（今日中午前）', priority: '高级' },
    { id: 'TT-003', taskNo: 'TODO-2026-000003', type: '会诊申请', content: '响应急诊骨科会诊申请（患者：刘***，男，72 岁，股骨颈骨折）', deadline: '2026-10-20 10:30:00（30 分钟内响应）', priority: '高级' },
    { id: 'TT-004', taskNo: 'TODO-2026-000004', type: '出院审核', content: '审核普外科今日出院患者病历 5 份', deadline: '2026-10-20 16:00:00（今日下班前）', priority: '中级' },
    { id: 'TT-005', taskNo: 'TODO-2026-000005', type: '检查报告审核', content: '审核今日影像科检查报告 15 份（含 CT 报告 5 份）', deadline: '2026-10-20 18:00:00（今日下班前）', priority: '中级' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tasks/done - 已办任务 5 条 */
async function handleTasksDone(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TD-001', taskNo: 'DONE-2026-000001', type: '病历审核', content: '审核心内科昨日新入院患者病历 8 份', completeTime: '2026-10-19 16:30:00（昨日下班前）', result: '已完成（8 份病历全部审核通过，无质量问题）' },
    { id: 'TD-002', taskNo: 'DONE-2026-000002', type: '处方审核', content: '审核昨日门诊处方 18 张（含抗生素处方 4 张）', completeTime: '2026-10-19 11:30:00（昨日中午前）', result: '已完成（18 张处方全部审核通过，发现 1 张处方剂量偏大，已建议调整）' },
    { id: 'TD-003', taskNo: 'DONE-2026-000003', type: '会诊申请', content: '响应急诊心内科会诊申请（患者：张***，男，65 岁，突发胸痛）', completeTime: '2026-10-19 09:30:00（昨日上午）', result: '已完成（已出具会诊意见：考虑急性心肌梗死，建议立即行 PCI 治疗）' },
    { id: 'TD-004', taskNo: 'DONE-2026-000004', type: '出院审核', content: '审核普外科昨日出院患者病历 6 份', completeTime: '2026-10-19 15:30:00（昨日下班前）', result: '已完成（6 份病历全部审核通过，无质量问题）' },
    { id: 'TD-005', taskNo: 'DONE-2026-000005', type: '检查报告审核', content: '审核昨日影像科检查报告 12 份（含 CT 报告 4 份）', completeTime: '2026-10-19 17:30:00（昨日下班前）', result: '已完成（12 份报告全部审核通过，发现 1 份 CT 报告描述不完整，已建议补充）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tasks/overdue - 逾期任务 5 条 */
async function handleTasksOverdue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TO-001', taskNo: 'OVERDUE-2026-000001', type: '病历审核', content: '审核心内科 2026-10-18 新入院患者病历 5 份', overdueDays: '逾期 2 天（原定 2026-10-18 17:00 前完成）', owner: '李***（心内科主治医师）' },
    { id: 'TO-002', taskNo: 'OVERDUE-2026-000002', type: '处方审核', content: '审核 2026-10-19 急诊处方 3 张（含抢救药品处方 1 张）', overdueDays: '逾期 1 天（原定 2026-10-19 12:00 前完成）', owner: '王***（主管药师）' },
    { id: 'TO-003', taskNo: 'OVERDUE-2026-000003', type: '会诊申请', content: '响应普外科 2026-10-18 会诊申请（患者：孙***，女，45 岁，甲状腺结节）', overdueDays: '逾期 2 天（原定 2026-10-18 14:00 前响应）', owner: '赵***（骨科主任医师，实际应由普外科周***副主任医师响应）' },
    { id: 'TO-004', taskNo: 'OVERDUE-2026-000004', type: '出院审核', content: '审核普外科 2026-10-17 出院患者病历 4 份', overdueDays: '逾期 3 天（原定 2026-10-17 17:00 前完成）', owner: '周***（普外科副主任医师）' },
    { id: 'TO-005', taskNo: 'OVERDUE-2026-000005', type: '检查报告审核', content: '审核影像科 2026-10-18 检查报告 8 份（含 MRI 报告 2 份）', overdueDays: '逾期 2 天（原定 2026-10-18 18:00 前完成）', owner: '郑***（影像科主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m342Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/tasks', handle: handleWorkflowTasks, auth: true },
  { method: 'GET', path: '/api/v1/workflow/templates', handle: handleWorkflowTemplates, auth: true },
  { method: 'GET', path: '/api/v1/tasks/todo', handle: handleTasksTodo, auth: true },
  { method: 'GET', path: '/api/v1/tasks/done', handle: handleTasksDone, auth: true },
  { method: 'GET', path: '/api/v1/tasks/overdue', handle: handleTasksOverdue, auth: true },
];
