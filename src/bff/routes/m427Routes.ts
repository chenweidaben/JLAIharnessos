/**
 * 健澜科技 jlmedaios - M427 P1 业务扩展：角色工作流深度打磨（补建）
 *
 * 角色详情/流程节点详情/流转历史/升级规则
 * （instances-detail、tasks-detail 已在 M407 建立，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/roles-detail - 角色详情 5 条（角色名/编码/所属工作流/权限集/状态） */
async function handleWorkflowRolesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WRD-001', roleName: '角色名：门诊主治医生', roleCode: '角色编码：WF-ROLE-MZ-ZZ', belongFlow: '所属工作流：门诊电子处方审批流', permissionSet: '权限集：1. 开具处方；2. 查看本人接诊患者；3. 提交处方至药师审核；4. 驳回不合理处方', status: '状态：启用中（绑定主治医生岗位，28 人）' },
    { id: 'WRD-002', roleName: '角色名：药房审核药师', roleCode: '角色编码：WF-ROLE-PH-CHECK', belongFlow: '所属工作流：门诊电子处方审批流', permissionSet: '权限集：1. 审核处方合理性；2. 通过/退回处方；3. 调整剂量建议；4. 登记用药交互风险', status: '状态：启用中（绑定药房审核岗，12 人）' },
    { id: 'WRD-003', roleName: '角色名：护士长', roleCode: '角色编码：WF-ROLE-NUR-HEAD', belongFlow: '所属工作流：病区护理派班流', permissionSet: '权限集：1. 分配护理任务；2. 调整班次；3. 审批护士换班；4. 查看病区护理进度', status: '状态：启用中（绑定各病区护士长，18 人）' },
    { id: 'WRD-004', roleName: '角色名：科主任', roleCode: '角色编码：WF-ROLE-DEPT-DIR', belongFlow: '所属工作流：三级查房审批流', permissionSet: '权限集：1. 终审疑难病例；2. 审批特殊治疗方案；3. 签署重大诊疗意见；4. 查看科室全部病例', status: '状态：启用中（绑定科室主任，32 人）' },
    { id: 'WRD-005', roleName: '角色名：医保结算员', roleCode: '角色编码：WF-ROLE-INS-CASH', belongFlow: '所属工作流：医保费用结算流', permissionSet: '权限集：1. 核对费用明细；2. 发起医保结算；3. 处理拒付申诉；4. 查看结算单据', status: '状态：启用中（绑定医保结算窗口，9 人）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/nodes-detail - 流程节点详情 5 条（节点名/类型/处理人角色/超时/规则） */
async function handleWorkflowNodesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WND-001', nodeName: '节点名：医生开方节点', nodeType: '节点类型：人工审批节点（任务节点）', assigneeRole: '处理人角色：门诊主治医生（WF-ROLE-MZ-ZZ）', timeout: '超时：24 小时未提交自动提醒，48 小时升级至科主任', rule: '规则：1. 必填诊断与处方药品；2. 抗菌药物需标注理由；3. 提交后进入药师审核节点' },
    { id: 'WND-002', nodeName: '节点名：药师审核节点', nodeType: '节点类型：人工审批节点（会签节点）', assigneeRole: '处理人角色：药房审核药师（WF-ROLE-PH-CHECK）', timeout: '超时：2 小时未审核自动催办，4 小时升级药剂科主任', rule: '规则：1. 审核配伍禁忌与剂量；2. 通过则流转发药，退回则回医生开方节点；3. 双人复核高风险处方' },
    { id: 'WND-003', nodeName: '节点名：发药节点', nodeType: '节点类型：自动任务节点（系统节点）', assigneeRole: '处理人角色：系统自动（无需人工）', timeout: '超时：无超时（系统即时执行）', rule: '规则：1. 审核通过后自动生成发药任务；2. 推送至窗口药师；3. 扣减库存并记录' },
    { id: 'WND-004', nodeName: '节点名：三级查房终审节点', nodeType: '节点类型：人工审批节点（终审节点）', assigneeRole: '处理人角色：科主任（WF-ROLE-DEPT-DIR）', timeout: '超时：48 小时未查房自动提醒，72 小时升级医务处', rule: '规则：1. 主治、主任两级查房通过后终审；2. 终审意见归档；3. 可退回主治补充' },
    { id: 'WND-005', nodeName: '节点名：结算完成节点', nodeType: '节点类型：网关分支节点（条件网关）', assigneeRole: '处理人角色：系统按条件自动路由', timeout: '超时：无超时（即时路由）', rule: '规则：1. 医保统筹走结算员复核分支；2. 自费走自动结算分支；3. 异常费用转人工申诉分支' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/history-detail - 流转历史 5 条（实例号/节点/操作人/动作/时间） */
async function handleWorkflowHistoryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WHH-001', instanceNo: '实例号：WF-INST-2026-1001（门诊处方流，患者张***）', node: '节点：医生开方节点', operator: '操作人：王***（主治医生，工号 D-001）', action: '动作：提交处方（开具阿莫西林胶囊 0.5g×6 次）', time: '时间：2026-10-20 09:12:30' },
    { id: 'WHH-002', instanceNo: '实例号：WF-INST-2026-1001（门诊处方流，患者张***）', node: '节点：药师审核节点', operator: '操作人：李***（审核药师，工号 P-015）', action: '动作：审核通过（配伍合理，剂量适宜，同意发药）', time: '时间：2026-10-20 09:25:10' },
    { id: 'WHH-003', instanceNo: '实例号：WF-INST-2026-1002（三级查房流，患者李***）', node: '节点：主治查房节点', operator: '操作人：刘***（主治医生，工号 D-015）', action: '动作：提交查房记录（病情平稳，继续当前治疗方案）', time: '时间：2026-10-20 10:05:42' },
    { id: 'WHH-004', instanceNo: '实例号：WF-INST-2026-1002（三级查房流，患者李***）', node: '节点：科主任终审节点', operator: '操作人：赵***（科主任，工号 D-003）', action: '动作：终审通过（同意方案，记录归档）', time: '时间：2026-10-20 11:30:08' },
    { id: 'WHH-005', instanceNo: '实例号：WF-INST-2026-1003（医保结算流，患者陈***）', node: '节点：结算复核节点', operator: '操作人：钱***（医保结算员，工号 I-007）', action: '动作：退回补正（检查费项目编码与医保目录不符，需更正）', time: '时间：2026-10-20 14:20:55' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/escalation-detail - 升级规则 5 条（规则名/触发条件/升级目标/超时/启用状态） */
async function handleWorkflowEscalationDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WES-001', ruleName: '规则名：处方医生超时未提交升级', triggerCondition: '触发条件：医生开方节点停留超过 48 小时未提交', escalateTarget: '升级目标：自动升级至所在科室主任督办，并推送催办短信', timeout: '超时：24h 提醒 / 48h 升级', enabled: '启用状态：启用中' },
    { id: 'WES-002', ruleName: '规则名：药师审核超时升级', triggerCondition: '触发条件：药师审核节点停留超过 4 小时未处理', escalateTarget: '升级目标：转药剂科主任代为审核并记录超时', timeout: '超时：2h 催办 / 4h 升级', enabled: '启用状态：启用中' },
    { id: 'WES-003', ruleName: '规则名：三级查房超时升级医务处', triggerCondition: '触发条件：科主任终审节点停留超过 72 小时未查房', escalateTarget: '升级目标：报送医务处质量控制科，纳入科室考核', timeout: '超时：48h 提醒 / 72h 升级', enabled: '启用中' },
    { id: 'WES-004', ruleName: '规则名：护理任务未领取升级', triggerCondition: '触发条件：护理派班任务 2 小时内无护士领取', escalateTarget: '升级目标：通知护士长重新派单或跨病区协调', timeout: '超时：1h 提醒 / 2h 升级', enabled: '启用中' },
    { id: 'WES-005', ruleName: '规则名：结算申诉超期升级', triggerCondition: '触发条件：医保拒付申诉 15 个工作日未办结', escalateTarget: '升级目标：上报医保办主任专项督办', timeout: '超时：10 工作日提醒 / 15 工作日升级', enabled: '启用状态：启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m427Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/roles-detail', handle: handleWorkflowRolesDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/nodes-detail', handle: handleWorkflowNodesDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/history-detail', handle: handleWorkflowHistoryDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/escalation-detail', handle: handleWorkflowEscalationDetail, auth: true },
];
