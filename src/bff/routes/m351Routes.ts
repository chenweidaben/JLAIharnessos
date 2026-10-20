/**
 * 健澜科技 jlmedaios - M351 P0 合规改造：角色工作流深度打磨
 *
 * 角色工作流/工作流权限/审批/通知/升级/SLA（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/roles - 角色工作流 5 条 */
async function handleWorkflowRoles(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WR-001', roleName: '科室主任', workflow: '病历审核工作流（medical-record-approval）', node: '审核节点（第 2 步）', permission: '审核病历、退回修改、批准归档', status: '启用中' },
    { id: 'WR-002', roleName: '主治医师', workflow: '病历书写工作流（medical-record-writing）', node: '书写节点（第 1 步）', permission: '书写病历、提交审核、修改病历', status: '启用中' },
    { id: 'WR-003', roleName: '主管药师', workflow: '处方审核工作流（prescription-approval）', node: '审核节点（第 2 步）', permission: '审核处方、退回修改、批准调配', status: '启用中' },
    { id: 'WR-004', roleName: '住院医师', workflow: '医嘱执行工作流（order-execution）', node: '执行节点（第 2 步）', permission: '执行医嘱、记录执行结果、上报异常', status: '启用中' },
    { id: 'WR-005', roleName: '护士', workflow: '护理执行工作流（nursing-execution）', node: '执行节点（第 2 步）', permission: '执行护理医嘱、记录护理结果、上报异常', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/permissions - 工作流权限 5 条 */
async function handleWorkflowPermissions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WP-001', workflow: '病历审核工作流（medical-record-approval）', node: '书写节点（第 1 步）', role: '主治医师', action: '书写病历、提交审核', allowed: '允许（主治医师可书写本科室病历并提交审核）' },
    { id: 'WP-002', workflow: '病历审核工作流（medical-record-approval）', node: '审核节点（第 2 步）', role: '科室主任', action: '审核病历、退回修改、批准归档', allowed: '允许（科室主任可审核本科室病历并批准归档）' },
    { id: 'WP-003', workflow: '处方审核工作流（prescription-approval）', node: '审核节点（第 2 步）', role: '主管药师', action: '审核处方、退回修改、批准调配', allowed: '允许（主管药师可审核所有处方并批准调配）' },
    { id: 'WP-004', workflow: '医嘱执行工作流（order-execution）', node: '执行节点（第 2 步）', role: '住院医师', action: '执行医嘱、记录执行结果、上报异常', allowed: '允许（住院医师可执行本科室医嘱并记录结果）' },
    { id: 'WP-005', workflow: '护理执行工作流（nursing-execution）', node: '执行节点（第 2 步）', role: '护士', action: '执行护理医嘱、记录护理结果、上报异常', allowed: '允许（护士可执行本科室护理医嘱并记录结果）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/approve - 工作流审批 5 条 */
async function handleWorkflowApprove(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WA-001', approveNo: 'APP-2026-10-20-000001', workflow: '病历审核工作流（medical-record-approval）', node: '审核节点（第 2 步）', approver: '王***（心内科副主任医师，科室主任）', result: '审批通过（病历内容真实、完整，符合诊疗规范，批准归档）' },
    { id: 'WA-002', approveNo: 'APP-2026-10-20-000002', workflow: '病历审核工作流（medical-record-approval）', node: '审核节点（第 2 步）', approver: '陈***（骨科副主任医师，科室主任）', result: '审批退回（病历中"既往史"部分不完整，需补充"高血压病史 10 年"）' },
    { id: 'WA-003', approveNo: 'APP-2026-10-20-000003', workflow: '处方审核工作流（prescription-approval）', node: '审核节点（第 2 步）', approver: '李***（主管药师）', result: '审批通过（处方用药合理，符合诊疗规范，批准调配）' },
    { id: 'WA-004', approveNo: 'APP-2026-10-20-000004', workflow: '处方审核工作流（prescription-approval）', node: '审核节点（第 2 步）', approver: '李***（主管药师）', result: '审批退回（处方中"甲硝唑片"剂量偏大，建议从 0.4g 每日 3 次调整为 0.2g 每日 3 次）' },
    { id: 'WA-005', approveNo: 'APP-2026-10-20-000005', workflow: '出院审核工作流（discharge-approval）', node: '审核节点（第 2 步）', approver: '林***（普外科副主任医师，科室主任）', result: '审批通过（患者已达到出院标准，出院小结内容真实、完整）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/notify - 工作流通知 5 条 */
async function handleWorkflowNotify(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WN-001', notifyNo: 'NOTIFY-2026-10-20-000001', type: '待办通知（病历审核）', recipient: '王***（心内科副主任医师，科室主任）', content: '您有 5 份待审核的病历（患者：张***、李***、王***、刘***、陈***），请尽快审核', time: '2026-10-20 09:00:00（通知发送时间）' },
    { id: 'WN-002', notifyNo: 'NOTIFY-2026-10-20-000002', type: '退回通知（病历退回修改）', recipient: '李***（心内科主治医师）', content: '您提交的病历（患者：张***）已被科室主任退回修改（原因：既往史部分不完整），请尽快修改后重新提交', time: '2026-10-20 10:00:00（通知发送时间）' },
    { id: 'WN-003', notifyNo: 'NOTIFY-2026-10-20-000003', type: '待办通知（处方审核）', recipient: '李***（主管药师）', content: '您有 20 张待审核的处方（含抗生素处方 5 张），请尽快审核', time: '2026-10-20 10:30:00（通知发送时间）' },
    { id: 'WN-004', notifyNo: 'NOTIFY-2026-10-20-000004', type: '完成通知（病历归档）', recipient: '李***（心内科主治医师）', content: '您书写的病历（患者：张***）已完成审核并归档（科室主任已批准）', time: '2026-10-20 14:00:00（通知发送时间）' },
    { id: 'WN-005', notifyNo: 'NOTIFY-2026-10-20-000005', type: '完成通知（处方调配）', recipient: '王***（主管药师）', content: '您审核通过的处方（患者：王***）已完成药房调配（药房已发药）', time: '2026-10-20 15:00:00（通知发送时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/escalation - 工作流升级 5 条 */
async function handleWorkflowEscalation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WE-001', escalationNo: 'ESC-2026-10-20-000001', workflow: '病历审核工作流（medical-record-approval）', node: '审核节点（第 2 步）', reason: '病历已提交审核超过 24 小时未处理（超时未审核）', time: '2026-10-20 09:00:00（升级触发时间）' },
    { id: 'WE-002', escalationNo: 'ESC-2026-10-20-000002', workflow: '处方审核工作流（prescription-approval）', node: '审核节点（第 2 步）', reason: '处方已提交审核超过 4 小时未处理（超时未审核，患者在等待取药）', time: '2026-10-20 10:00:00（升级触发时间）' },
    { id: 'WE-003', escalationNo: 'ESC-2026-10-20-000003', workflow: '医嘱执行工作流（order-execution）', node: '执行节点（第 2 步）', reason: '医嘱已下达超过 2 小时未执行（超时未执行，可能影响患者治疗）', time: '2026-10-20 11:00:00（升级触发时间）' },
    { id: 'WE-004', escalationNo: 'ESC-2026-10-20-000004', workflow: '出院审核工作流（discharge-approval）', node: '审核节点（第 2 步）', reason: '出院小结已提交审核超过 12 小时未处理（超时未审核，患者在等待出院）', time: '2026-10-20 14:00:00（升级触发时间）' },
    { id: 'WE-005', escalationNo: 'ESC-2026-10-20-000005', workflow: '护理执行工作流（nursing-execution）', node: '执行节点（第 2 步）', reason: '护理医嘱已下达超过 1 小时未执行（超时未执行，可能影响患者护理）', time: '2026-10-20 15:00:00（升级触发时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/sla - 工作流 SLA 5 条 */
async function handleWorkflowSla(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WS-001', workflow: '病历审核工作流（medical-record-approval）', node: '审核节点（第 2 步）', timeLimit: '24 小时（从病历提交到审核完成的最长时限）', used: '已用 12 小时（病历已提交 12 小时）', remaining: '剩余 12 小时（距 SLA 超时还有 12 小时）' },
    { id: 'WS-002', workflow: '处方审核工作流（prescription-approval）', node: '审核节点（第 2 步）', timeLimit: '4 小时（从处方开具到审核完成的最长时限）', used: '已用 2 小时（处方已开具 2 小时）', remaining: '剩余 2 小时（距 SLA 超时还有 2 小时）' },
    { id: 'WS-003', workflow: '医嘱执行工作流（order-execution）', node: '执行节点（第 2 步）', timeLimit: '2 小时（从医嘱下达到执行完成的最长时限）', used: '已用 1 小时（医嘱已下达 1 小时）', remaining: '剩余 1 小时（距 SLA 超时还有 1 小时）' },
    { id: 'WS-004', workflow: '出院审核工作流（discharge-approval）', node: '审核节点（第 2 步）', timeLimit: '12 小时（从出院小结提交到审核完成的最长时限）', used: '已用 6 小时（出院小结已提交 6 小时）', remaining: '剩余 6 小时（距 SLA 超时还有 6 小时）' },
    { id: 'WS-005', workflow: '护理执行工作流（nursing-execution）', node: '执行节点（第 2 步）', timeLimit: '1 小时（从护理医嘱下达到执行完成的最长时限）', used: '已用 30 分钟（护理医嘱已下达 30 分钟）', remaining: '剩余 30 分钟（距 SLA 超时还有 30 分钟）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m351Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/roles', handle: handleWorkflowRoles, auth: true },
  { method: 'GET', path: '/api/v1/workflow/permissions', handle: handleWorkflowPermissions, auth: true },
  { method: 'GET', path: '/api/v1/workflow/approve', handle: handleWorkflowApprove, auth: true },
  { method: 'GET', path: '/api/v1/workflow/notify', handle: handleWorkflowNotify, auth: true },
  { method: 'GET', path: '/api/v1/workflow/escalation', handle: handleWorkflowEscalation, auth: true },
  { method: 'GET', path: '/api/v1/workflow/sla', handle: handleWorkflowSla, auth: true },
];
