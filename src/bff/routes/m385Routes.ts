/**
 * 健澜科技 jlmedaios - M385 P1 业务扩展：工作流任务调度深度打磨
 *
 * 审批流程/任务调度/工作流通知（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/approval - 审批流程 5 条 */
async function handleWorkflowApproval(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WA-001', approvalId: 'APR-2026-1001', type: '采购审批（药品采购申请）', initiator: '药剂科主任王***', approver: '分管副院长李***', status: '已审批（批准采购申请）' },
    { id: 'WA-002', approvalId: 'APR-2026-1002', type: '请假审批（医生事假申请）', initiator: '内科医生张***', approver: '内科主任赵***', status: '已审批（批准事假申请）' },
    { id: 'WA-003', approvalId: 'APR-2026-1003', type: '报销审批（差旅费报销申请）', initiator: '行政科职员刘***', approver: '财务科主任孙***', status: '审批中（待财务科主任审批）' },
    { id: 'WA-004', approvalId: 'APR-2026-1004', type: '招聘审批（护士招聘申请）', initiator: '护理部主任周***', approver: '分管副院长吴***', status: '已审批（批准招聘申请）' },
    { id: 'WA-005', approvalId: 'APR-2026-1005', type: '设备采购审批（医疗设备采购申请）', initiator: '设备科主任陈***', approver: '院长郑***', status: '审批中（待院长审批）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/scheduling - 任务调度 5 条 */
async function handleWorkflowScheduling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WS-001', taskName: '每日病历质控任务', schedulingRule: '每日凌晨 02:00 自动执行', executionTime: '2026-10-20 02:00:00（执行时间）', status: '已完成', result: '完成昨日全部出院病历质控，共检查病历 150 份，发现问题 5 份' },
    { id: 'WS-002', taskName: '每日医保结算对账任务', schedulingRule: '每日凌晨 03:00 自动执行', executionTime: '2026-10-20 03:00:00（执行时间）', status: '已完成', result: '完成昨日医保结算对账，共结算医保费用 50 万元，对账无差异' },
    { id: 'WS-003', taskName: '每周药品库存盘点任务', schedulingRule: '每周一凌晨 04:00 自动执行', executionTime: '2026-10-20 04:00:00（执行时间）', status: '已完成', result: '完成本周药品库存盘点，共盘点药品 500 种，库存差异 0 种' },
    { id: 'WS-004', taskName: '每月财务报表生成任务', schedulingRule: '每月 1 日凌晨 05:00 自动执行', executionTime: '2026-10-01 05:00:00（执行时间）', status: '已完成', result: '完成 9 月份财务报表生成，共生成报表 10 份' },
    { id: 'WS-005', taskName: '每年设备巡检任务', schedulingRule: '每年 1 月 1 日凌晨 06:00 自动执行', executionTime: '2026-01-01 06:00:00（执行时间）', status: '已完成', result: '完成 2025 年度设备巡检，共巡检设备 200 台，发现故障设备 5 台' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/notifications - 工作流通知 5 条 */
async function handleWorkflowNotifications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WN-001', notificationId: 'NTF-2026-1001', type: '审批通知（采购审批待审批）', recipient: '分管副院长李***', content: '药剂科主任王***提交的药品采购申请待您审批，请及时处理', time: '2026-10-20 09:00:00（通知时间）' },
    { id: 'WN-002', notificationId: 'NTF-2026-1002', type: '任务通知（病历质控任务已完成）', recipient: '质控科主任赵***', content: '今日凌晨 02:00 自动执行的病历质控任务已完成，请查看质控结果', time: '2026-10-20 08:00:00（通知时间）' },
    { id: 'WN-003', notificationId: 'NTF-2026-1003', type: '提醒通知（病假即将到期）', recipient: '内科医生张***', content: '您的病假将于 2026-10-25 到期，请及时返岗或办理续假手续', time: '2026-10-20 10:00:00（通知时间）' },
    { id: 'WN-004', notificationId: 'NTF-2026-1004', type: '公告通知（医院年度体检安排）', recipient: '全院职工', content: '医院定于 2026-11-01 至 2026-11-15 进行年度体检，请各科室合理安排工作', time: '2026-10-20 11:00:00（通知时间）' },
    { id: 'WN-005', notificationId: 'NTF-2026-1005', type: '预警通知（药品库存预警）', recipient: '药剂科主任王***', content: '阿莫西林胶囊库存低于安全库存（当前库存 50 盒，安全库存 100 盒），请及时补货', time: '2026-10-20 14:00:00（通知时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m385Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/approval', handle: handleWorkflowApproval, auth: true },
  { method: 'GET', path: '/api/v1/workflow/scheduling', handle: handleWorkflowScheduling, auth: true },
  { method: 'GET', path: '/api/v1/workflow/notifications', handle: handleWorkflowNotifications, auth: true },
];
