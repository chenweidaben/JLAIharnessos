/**
 * 健澜科技 jlmedaios - 角色工作流引擎监控看板 API（M512）
 * 对接 BFF /api/v1/workflow/* ：
 *   /workflow/instances 工作流实例
 *   /workflow/nodes     节点监控
 *   /workflow/stats      流程统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface InstanceRow {
  id: string;
  process: 'outpatient' | 'inpatientOrder' | 'labRequest' | 'imagingRequest' | 'surgerySchedule';
  currentNode: string;
  role: 'doctor' | 'nurse' | 'pharmacist' | 'labTech' | 'imagingTech';
  status: 'running' | 'completed' | 'error' | 'terminated';
  demo?: boolean;
}

export interface NodeRow {
  id: string;
  nodeName: string;
  handler: string;
  avgMinutes: number;
  backlog: number;
  demo?: boolean;
}

export interface WorkflowStats {
  totalToday: number;
  avgFlowMinutes: number;
  errorRate: number; // %
  todoByRoles: number;
  demo?: boolean;
}

const DEMO_INSTANCES: InstanceRow[] = [
  { id: 'wf-1', process: 'outpatient', currentNode: '开具处方', role: 'doctor', status: 'running', demo: true },
  { id: 'wf-2', process: 'inpatientOrder', currentNode: '护士核对', role: 'nurse', status: 'running', demo: true },
  { id: 'wf-3', process: 'labRequest', currentNode: '检验科审核', role: 'labTech', status: 'completed', demo: true },
  { id: 'wf-4', process: 'imagingRequest', currentNode: '影像科预约', role: 'imagingTech', status: 'error', demo: true },
  { id: 'wf-5', process: 'surgerySchedule', currentNode: '麻醉评估', role: 'doctor', status: 'terminated', demo: true },
];

const DEMO_NODES: NodeRow[] = [
  { id: 'n-1', nodeName: '门诊接诊', handler: '门诊医生', avgMinutes: 3.2, backlog: 0, demo: true },
  { id: 'n-2', nodeName: '医嘱核对', handler: '病房护士', avgMinutes: 8.5, backlog: 12, demo: true },
  { id: 'n-3', nodeName: '药品调配', handler: '药房药师', avgMinutes: 18.2, backlog: 36, demo: true },
  { id: 'n-4', nodeName: '检验签收', handler: '检验技师', avgMinutes: 6.0, backlog: 5, demo: true },
];

const DEMO_STATS: WorkflowStats = {
  totalToday: 5280,
  avgFlowMinutes: 14.6,
  errorRate: 0.32,
  todoByRoles: 186,
  demo: true,
};

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchInstances = () => safeGet<InstanceRow>('/workflow/instances', DEMO_INSTANCES);
export const fetchNodes = () => safeGet<NodeRow>('/workflow/nodes', DEMO_NODES);
export const fetchStats = () => safeGetSingle<WorkflowStats>('/workflow/stats', DEMO_STATS);
