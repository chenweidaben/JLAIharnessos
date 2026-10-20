/**
 * 健澜科技 jlmedaios - M470 角色工作流打磨（workflow）
 *
 * 角色菜单/权限 / 待办中心 / 角色交接 / 审批链 / 操作审计时间线
 * （workflow/notifications 通知聚合已存在，此处不重复）。
 * 避开 /outpatient/queue 与 /outpatient/encounters/:id 既有路由，不改动。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/role-menu - 按角色返回工作台菜单与权限点（角色/菜单组/权限点/可见性）5 条 */
async function handleWfRoleMenu(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RMN-001', role: '角色：主治医师（住院医师组）', group: '菜单组：病历书写 / 医嘱管理 / 患者管理 / 临床路径', perms: '权限点：新建病历、开立医嘱、提交审核、查看本科室患者', visibility: '可见性：本科室数据可见，跨科只读（权限隔离）' },
    { id: 'RMN-002', role: '角色：责任护士（病区护理）', group: '菜单组：床旁执行 / 护理记录 / 体征采集 / 交接班', perms: '权限点：扫码执行医嘱、录入护理记录、床旁体征采集', visibility: '可见性：本病区床位与患者可见' },
    { id: 'RMN-003', role: '角色：临床药师（药学部）', group: '菜单组：处方审核 / 用药监护 / ADR 上报 / 医嘱点评', perms: '权限点：审核处方、干预不合理用药、上报 ADR、专项点评', visibility: '可见性：全院处方与医嘱（审核视角）' },
    { id: 'RMN-004', role: '角色：检验技师（检验科）', group: '菜单组：标本签收 / 报告发布 / 危急值 / 质量控制', perms: '权限点：签收标本、审核发布报告、登记危急值', visibility: '可见性：本科室流程数据，患者信息脱敏视图' },
    { id: 'RMN-005', role: '角色：科室主任（医疗组）', group: '菜单组：全科概览 / 质控指标 / 绩效 / 审批管理', perms: '权限点：查看全科指标、审批权限内业务、质控干预', visibility: '可见性：本科室全量数据 + 审批节点，跨科只读' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/todo-center - 各角色待办工作项（角色/待办类型/数量/紧急度/入口）5 条 */
async function handleWfTodoCenter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TDC-001', role: '角色：主治医师', type: '待办类型：待提交病历（12 份）+ 待审核医嘱（5 条）', count: '数量：17 项', urgency: '紧急度：3 项今日出院病历临期（高），其余常规', entry: '入口：工作台"待办中心-医嘱/病历"直达' },
    { id: 'TDC-002', role: '角色：责任护士', type: '待办类型：待执行输液（28 组）+ 待录入体征（8 床）', count: '数量：36 项', urgency: '紧急度：4 组餐前药临点（高），按床旁优先级排序', entry: '入口：床旁 PDA 扫码 + 工作台待办列表' },
    { id: 'TDC-003', role: '角色：临床药师', type: '待办类型：待审核处方（42 张）+ 待点评专项（3 例）', count: '数量：45 项', urgency: '紧急度：急诊抗菌药处方优先（拦截级），门诊批量次之', entry: '入口："处方审核"队列按风险分级' },
    { id: 'TDC-004', role: '角色：检验技师', type: '待办类型：待审核报告（18 份）+ 待复核危急值（2 项）', count: '数量：20 项', urgency: '紧急度：2 项危急值需即刻回报临床（最高）', entry: '入口："报告审核/危急值"红色角标直达' },
    { id: 'TDC-005', role: '角色：科室主任', type: '待办类型：待审批业务（6 项：用血申请 2、退药 1、权限内 3）', count: '数量：6 项', urgency: '紧急度：用血申请临床等待中（中高），按到达时间排序', entry: '入口："审批中心"按业务类型分组' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/role-handoff - 工作交接单（交班科室/接班科室/班次/交接事项/状态）5 条 */
async function handleWfRoleHandoff(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HND-001', from: '交班科室：内科三病区（白班护士组）', to: '接班科室：内科三病区（夜班护士组）', shift: '班次：白 08:00 → 夜 20:00（交接班）', items: '交接事项：术后 2 例重点观察、1 例吸氧待停、药品基数清点', status: '状态：双方签字确认，已归档' },
    { id: 'HND-002', from: '交班科室：急诊科（日班医生）', to: '接班科室：急诊科（夜班医生）', shift: '班次：日班 → 夜班', items: '交接事项：留观 3 例病情变化、胸痛绿色通道 1 例随访、待收住院 2 例', status: '状态：交接中（系统在线确认，双签留痕）' },
    { id: 'HND-003', from: '交班科室：ICU（白班医护）', to: '接班科室：ICU（夜班医护）', shift: '班次：白 08:00 → 夜 20:00', items: '交接事项：呼吸机参数 3 例、血管活性药 2 例、管路固定核查', status: '状态：已交接并双签，监护重点清单已转夜班' },
    { id: 'HND-004', from: '交班科室：手术室（日班）', to: '接班科室：手术室（值班组）', shift: '班次：择期手术收尾 → 急诊手术值班', items: '交接事项：器械清点、待接急诊剖宫产 1 台、无菌包效期核查', status: '状态：已交接，急诊台位待命' },
    { id: 'HND-005', from: '交班科室：药房（中晚班）', to: '接班科室：药房（夜班值班）', shift: '班次：17:00 → 夜班', items: '交接事项：紧急缺药登记、麻精药品双人双锁交接、夜间用药咨询指引', status: '状态：已交接并台账登记' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/approval-chain - 业务审批链（业务类型/节点/审批人/状态/耗时）5 条 */
async function handleWfApprovalChain(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'APC-001', bizType: '业务类型：急诊处方审核（抗菌药）', nodes: '节点：药师初审 → 药师主管复核（2 节点）', approver: '审批人：初审药师 王*** → 主管药师 赵***', status: '状态：已通过（拦截后通过）', duration: '耗时：初审 3min / 复核 2min（合计 5min）' },
    { id: 'APC-002', bizType: '业务类型：用血申请（红细胞 2U）', nodes: '节点：申请医师 → 输血科审核 → 科主任审批（3 节点）', approver: '审批人：申请医师 → 输血科 李*** → 科主任 周***', status: '状态：科主任审批中（临床等待）', duration: '耗时：已用 12min（输血科审核 8min，主任节点待批）' },
    { id: 'APC-003', bizType: '业务类型：退药申请（门诊）', nodes: '节点：开方医师确认 → 药师复核 → 药房退药（3 节点）', approver: '审批人：开方医师 → 药师 陈*** → 药房组长', status: '状态：已完成退药', duration: '耗时：合计 18min（当日闭环）' },
    { id: 'APC-004', bizType: '业务类型：限制级抗菌药授权', nodes: '节点：科室申请 → 药学部审核 → 医务部审批（3 节点）', approver: '审批人：科主任 → 药学部 郑*** → 医务部', status: '状态：药学部审核中', duration: '耗时：已用 1 天（常规授权流程，非紧急）' },
    { id: 'APC-005', bizType: '业务类型：高值耗材使用申请（骨科）', nodes: '节点：主刀医师 → 耗材管理科 → 设备科审批（3 节点）', approver: '审批人：主刀 → 耗材科 吴*** → 设备科', status: '状态：已通过（术前 1 天完成）', duration: '耗时：合计 26h（术前审批留足时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/activity-log - 角色操作审计时间线（角色/操作/对象/时间/IP或终端）5 条 */
async function handleWfActivityLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ACL-001', role: '角色：主治医师 王***', action: '操作：提交病历（出院小结）', target: '对象：住院号 ZY-2026-08123 患者', time: '时间：2026-10-20 09:42:15', terminal: 'IP/终端：10.12.3.45 / 医生站 PC（内网）' },
    { id: 'ACL-002', role: '角色：责任护士 李***', action: '操作：扫码执行输液医嘱', target: '对象：床号 12-3 患者，输液组 1 组', time: '时间：2026-10-20 09:38:02', terminal: 'IP/终端：PDA 手持终端（无线 AP-病区12）' },
    { id: 'ACL-003', role: '角色：临床药师 赵***', action: '操作：干预不合理处方并批注', target: '对象：门诊处方 MZ-2026-55678', time: '时间：2026-10-20 09:31:48', terminal: 'IP/终端：10.12.8.20 / 药师工作站' },
    { id: 'ACL-004', role: '角色：检验技师 周***', action: '操作：审核发布检验报告', target: '对象：标本号 LAB-2026-99211', time: '时间：2026-10-20 09:25:33', terminal: 'IP/终端：检验科 LIS 终端 10.12.6.11' },
    { id: 'ACL-005', role: '角色：科主任 陈***', action: '操作：审批用血申请（通过）', target: '对象：用血申请 BLD-2026-0088', time: '时间：2026-10-20 09:18:20', terminal: 'IP/终端：10.12.3.2 / 主任工作站 PC' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m470Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/role-menu', handle: handleWfRoleMenu, auth: true },
  { method: 'GET', path: '/api/v1/workflow/todo-center', handle: handleWfTodoCenter, auth: true },
  { method: 'GET', path: '/api/v1/workflow/role-handoff', handle: handleWfRoleHandoff, auth: true },
  { method: 'GET', path: '/api/v1/workflow/approval-chain', handle: handleWfApprovalChain, auth: true },
  { method: 'GET', path: '/api/v1/workflow/activity-log', handle: handleWfActivityLog, auth: true },
];
