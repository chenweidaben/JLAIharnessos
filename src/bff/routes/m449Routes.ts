/**
 * 健澜科技 jlmedaios - M449 角色工作流深化（workflow）
 *
 * 审批节点 / 角色路由 / 任务流转
 * （definitions 流程定义、instances 实例、monitor 监控已存在，此处不重复）。
 * 与 M427/M407 的 *-detail 详情端点不冲突。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/nodes - 审批节点（流程号/节点名/审批角色/条件/顺序）5 条 */
async function handleWfNodes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WND-001', flowNo: '流程号：WF-OP-01（采购申请审批流）', nodeName: '节点名：发起申请（科室经办人）', role: '审批角色：科室经办人（发起节点）', condition: '条件：填写采购明细并提交，系统自动进入下一节点', order: '顺序：第 1 步（发起）' },
    { id: 'WND-002', flowNo: '流程号：WF-OP-01（采购申请审批流）', nodeName: '节点名：科室负责人初审', role: '审批角色：科室主任（初审，核对必要性与预算）', condition: '条件：初审通过进入财务审核，退回则回到发起人', order: '顺序：第 2 步（初审）' },
    { id: 'WND-003', flowNo: '流程号：WF-OP-01（采购申请审批流）', nodeName: '节点名：财务预算审核', role: '审批角色：财务主管（核对预算额度与支出科目）', condition: '条件：金额超 5 万自动加签分管院长节点', order: '顺序：第 3 步（财务审核）' },
    { id: 'WND-004', flowNo: '流程号：WF-EMR-02（病历质控修订流）', nodeName: '节点名：质控科复核', role: '审批角色：质控科质控员（复核缺陷整改）', condition: '条件：整改完成后复核，合格闭环，不合格退回责任医生', order: '顺序：第 2 步（复核）' },
    { id: 'WND-005', flowNo: '流程号：WF-PAT-03（请假/排班审批流）', nodeName: '节点名：人事备案（终审）', role: '审批角色：人事专员（备案与考勤核销）', condition: '条件：部门负责人通过后人事备案归档', order: '顺序：第 3 步（终审备案）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/role-routes - 角色路由（角色/可办流程/默认节点/权限/状态）5 条 */
async function handleWfRoleRoutes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WRR-001', role: '角色：科室主任（部门负责人）', flows: '可办流程：采购初审、排班审批、请假审批、质控复核', defaultNode: '默认节点：部门初审节点（WF-OP-01 第 2 步）', permission: '权限：审批/退回/转办，可查看本部门全部在办单', status: '状态：启用（active，路由已配置）' },
    { id: 'WRR-002', role: '角色：财务主管', flows: '可办流程：采购财务审核、报销审核、预算调整审批', defaultNode: '默认节点：财务审核节点（WF-OP-01 第 3 步）', permission: '权限：审核/退回/加签，查看预算执行情况', status: '状态：启用（active）' },
    { id: 'WRR-003', role: '角色：质控科质控员', flows: '可办流程：病历质控复核、缺陷整改闭环', defaultNode: '默认节点：质控复核节点（WF-EMR-02 第 2 步）', permission: '权限：复核通过/退回，出具质控整改意见', status: '状态：启用（active）' },
    { id: 'WRR-004', role: '角色：分管院长（院领导）', flows: '可办流程：大额采购加签、重大事项审批（终审）', defaultNode: '默认节点：终审/加签节点（金额超阈值自动流转）', permission: '权限：终审批准/驳回，查看全院在办汇总', status: '状态：启用（active）' },
    { id: 'WRR-005', role: '角色：科室经办人（普通办事员）', flows: '可办流程：发起采购/报销申请，跟踪本人提交单据', defaultNode: '默认节点：发起节点（仅本人发起的单据可见）', permission: '权限：发起/撤回/补充材料，无审批权', status: '状态：停用（inactive，路由待重新配置）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/transitions - 任务流转（实例号/从节点/到节点/操作人/时间）5 条 */
async function handleWfTransitions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WTR-001', instanceNo: '实例号：INST-20261020-01（采购审批）', fromNode: '从节点：科室初审（WF-OP-01 第 2 步）', toNode: '到节点：财务审核（WF-OP-01 第 3 步）', operator: '操作人：科室主任 王***（审批通过）', time: '时间：2026-10-20 09:42:10' },
    { id: 'WTR-002', instanceNo: '实例号：INST-20261020-02（报销审批）', fromNode: '从节点：财务审核（WF-OP-01 第 3 步）', toNode: '到节点：人事备案（终审归档）', operator: '操作人：财务主管 李***（审核通过）', time: '时间：2026-10-20 10:15:33' },
    { id: 'WTR-003', instanceNo: '实例号：INST-20261019-03（病历质控修订）', fromNode: '从节点：质控复核（WF-EMR-02 第 2 步）', toNode: '到节点：退回责任医生（整改重新提交）', operator: '操作人：质控员 郑***（复核未通过，退回整改）', time: '时间：2026-10-19 16:20:48' },
    { id: 'WTR-004', instanceNo: '实例号：INST-20261019-04（大额采购加签）', fromNode: '从节点：财务审核（WF-OP-01 第 3 步）', toNode: '到节点：分管院长终审（超 5 万自动加签）', operator: '操作人：财务主管 李***（加签流转院长节点）', time: '时间：2026-10-19 14:05:22' },
    { id: 'WTR-005', instanceNo: '实例号：INST-20261018-05（请假审批）', fromNode: '从节点：部门负责人初审（WF-PAT-03 第 2 步）', toNode: '到节点：人事备案归档（终审完成）', operator: '操作人：部门负责人 赵***（审批通过）', time: '时间：2026-10-18 17:30:09' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m449Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/nodes', handle: handleWfNodes, auth: true },
  { method: 'GET', path: '/api/v1/workflow/role-routes', handle: handleWfRoleRoutes, auth: true },
  { method: 'GET', path: '/api/v1/workflow/transitions', handle: handleWfTransitions, auth: true },
];
