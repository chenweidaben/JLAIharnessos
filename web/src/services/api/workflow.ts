/**
 * 健澜科技 jlmedaios - 医生工作台待办中心 API（M471）
 *
 * 对接 BFF /api/v1/workflow/* ：
 *   - /workflow/todo-center    角色待办列表
 *   - /workflow/approval-chain 审批流链路
 *   - /workflow/role-handoff   角色交接
 *   - /workflow/activity-log  活动日志
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true，页面照常渲染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

// ------------------------------ 类型 ------------------------------

export interface TodoItem {
  id: string;
  type: string;
  title: string;
  patient?: string;
  dept?: string;
  priority: 'high' | 'medium' | 'low';
  dueAt?: string;
  status: 'pending' | 'processing' | 'done';
  assignee?: string;
  demo?: boolean;
}

export interface ApprovalNode {
  id: string;
  step: number;
  name: string;
  approver: string;
  status: 'approved' | 'rejected' | 'pending' | 'skipped';
  actedAt?: string;
  comment?: string;
}

export interface HandoffRecord {
  id: string;
  fromRole: string;
  toRole: string;
  fromUser: string;
  toUser: string;
  taskRef: string;
  handoffAt: string;
  note?: string;
}

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  target?: string;
  happenedAt: string;
  detail?: string;
}

// ------------------------------ DEMO 兜底 ------------------------------

const DEMO_TODOS: TodoItem[] = [
  { id: 't-1', type: '病历质控', title: '出院小结终末质控待复核', patient: '张**（住院号 ZY2026101801）', dept: '心内科一病区', priority: 'high', dueAt: '2026-10-20 18:00', status: 'pending', assignee: '王**', demo: true },
  { id: 't-2', type: '医嘱审核', title: '临时医嘱：抗生素联用审核', patient: '李**（住院号 ZY2026101903）', dept: '呼吸内科', priority: 'high', dueAt: '2026-10-20 12:00', status: 'processing', assignee: '王**', demo: true },
  { id: 't-3', type: '会诊申请', title: 'MDT 多学科会诊待排期', patient: '赵**（住院号 ZY2026101705）', dept: '肿瘤科', priority: 'medium', dueAt: '2026-10-21 10:00', status: 'pending', assignee: '王**', demo: true },
  { id: 't-4', type: '交接班', title: '夜班交班事项待签收', patient: '—', dept: '心内科一病区', priority: 'medium', dueAt: '2026-10-20 20:00', status: 'pending', assignee: '王**', demo: true },
  { id: 't-5', type: '处方点评', title: '门诊不合理处方待点评', patient: '门诊', dept: '门诊部', priority: 'low', dueAt: '2026-10-22 17:00', status: 'pending', assignee: '王**', demo: true },
];

const DEMO_APPROVAL: ApprovalNode[] = [
  { id: 'a-1', step: 1, name: '管床医生提交', approver: '陈**', status: 'approved', actedAt: '2026-10-20 09:10', comment: '已提交出院小结' },
  { id: 'a-2', step: 2, name: '主治医生审核', approver: '王**', status: 'approved', actedAt: '2026-10-20 10:25', comment: '同意出院' },
  { id: 'a-3', step: 3, name: '科主任审批', approver: '刘**', status: 'pending' },
  { id: 'a-4', step: 4, name: '医务处备案', approver: '系统', status: 'skipped' },
];

const DEMO_HANDOFF: HandoffRecord[] = [
  { id: 'h-1', fromRole: '管床医生', toRole: '夜班主治', fromUser: '陈**', toUser: '周**', taskRef: '危重患者观察', handoffAt: '2026-10-19 18:00', note: '夜间心率波动需随访' },
  { id: 'h-2', fromRole: '主治医生', toRole: '科主任', fromUser: '王**', toUser: '刘**', taskRef: 'MDT 排期确认', handoffAt: '2026-10-20 08:30' },
  { id: 'h-3', fromRole: '门诊医生', toRole: '住院总', fromUser: '孙**', toUser: '吴**', taskRef: '收新患者', handoffAt: '2026-10-20 11:00', note: '已完成收入院登记' },
];

const DEMO_ACTIVITY: ActivityEntry[] = [
  { id: 'l-1', actor: '王**', action: '审核医嘱', target: '临时医嘱 #O2026102011', happenedAt: '2026-10-20 10:42', detail: '抗生素联用通过' },
  { id: 'l-2', actor: '系统', action: '生成待办', target: '出院小结质控', happenedAt: '2026-10-20 09:00' },
  { id: 'l-3', actor: '陈**', action: '提交出院小结', target: 'ZY2026101801', happenedAt: '2026-10-20 08:55' },
  { id: 'l-4', actor: '周**', action: '夜班交接', target: '危重患者观察', happenedAt: '2026-10-19 18:05' },
];

// ------------------------------ 请求 ------------------------------

async function safeGet<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<{ items?: T } | T>(url);
    const items = Array.isArray(res)
      ? (res as unknown as T)
      : ((res as { items?: T })?.items ?? (fallback as T));
    const arr = items as unknown as unknown[];
    const isDemo = !Array.isArray(arr) || arr.length === 0;
    return { data: isDemo ? fallback : items, demo: isDemo };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchTodoCenter = () => safeGet<TodoItem[]>('/workflow/todo-center', DEMO_TODOS);
export const fetchApprovalChain = () =>
  safeGet<ApprovalNode[]>('/workflow/approval-chain', DEMO_APPROVAL);
export const fetchRoleHandoff = () =>
  safeGet<HandoffRecord[]>('/workflow/role-handoff', DEMO_HANDOFF);
export const fetchActivityLog = () =>
  safeGet<ActivityEntry[]>('/workflow/activity-log', DEMO_ACTIVITY);
