/**
 * 健澜科技 jlmedaios - 临床改进任务聚合器（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  createTask,
  getTask,
  listByAssignee,
  listBySource,
  transitionStatus,
} from '../../db/repositories/improvementTaskRepo.js';
import { canTransition, type TaskStatus } from '../../medical-tools/operations/improvementTask.js';

export class ImprovementError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ImprovementError';
  }
}
const badRequest = (m: string) => new ImprovementError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ImprovementError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new ImprovementError(409, 'CONFLICT', m);
const forbidden = (m: string) => new ImprovementError(403, 'FORBIDDEN', m);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 质控/医保办：从超支归因建整改单 + 通知被分派医生。 */
export async function createFromAttributionView(
  auth: AuthView,
  input: { visitId?: string; groupCode?: string; category?: string; title: string; finding: string; assigneeId: string; dueDate?: string },
) {
  if (!auth.permissions.includes('improvement_task:assign')) throw forbidden('缺少权限：improvement_task:assign');
  if (!input.title || !input.finding) throw badRequest('title/finding 必填');
  if (!UUID_RE.test(input.assigneeId.trim())) throw badRequest('assignee_id 非法');
  const task = await createTask({ ...input, createdBy: auth.id });
  await recordChainAudit(
    { actorId: auth.id, action: 'improvement_task.create', resourceType: 'clinical_improvement_tasks', resourceId: task.id, result: 'success', riskLevel: 'medium', detail: { assigneeId: input.assigneeId, category: input.category } },
  );
  return task;
}

/** DEMO_MODE 演示整改任务列表（P7）。 */
function demoTasks() {
  return [
    { id: 'demo-task-1', title: 'DRG 超支整改', finding: '心血管内科平均住院日超目标 1.2 天', assigneeId: 'demo-doc-1', status: 'open', category: 'drg_attribution', dueDate: '2026-11-01' },
    { id: 'demo-task-2', title: '病历书写缺陷整改', finding: '入院记录 24 小时未完成', assigneeId: 'demo-doc-2', status: 'in_progress', category: 'emr_quality', dueDate: '2026-10-25' },
    { id: 'demo-task-3', title: '合理用药整改', finding: '抗菌药物使用强度超标', assigneeId: 'demo-doc-3', status: 'open', category: 'drug_use', dueDate: '2026-11-15' },
    { id: 'demo-task-4', title: '院感防控整改', finding: 'ICU 手卫生依从率不足', assigneeId: 'demo-doc-4', status: 'closed', category: 'infection', dueDate: '2026-10-10' },
    { id: 'demo-task-5', title: '检查检验阳性率整改', finding: 'CT 阳性率低于质控标准', assigneeId: 'demo-doc-5', status: 'in_progress', category: 'lab_quality', dueDate: '2026-10-28' },
    { id: 'demo-task-6', title: '患者满意度整改', finding: '出院满意度低于 90%', assigneeId: 'demo-doc-6', status: 'open', category: 'satisfaction', dueDate: '2026-11-20' },
    { id: 'demo-task-7', title: '医保拒付整改', finding: 'DRG 分组错误导致拒付', assigneeId: 'demo-doc-7', status: 'open', category: 'insurance', dueDate: '2026-11-05' },
    { id: 'demo-task-8', title: '临床路径整改', finding: '路径变异率超 30%', assigneeId: 'demo-doc-8', status: 'closed', category: 'clinical_pathway', dueDate: '2026-10-15' },
  ];
}

export async function listMineView(auth: AuthView) {
  if (!auth.permissions.includes('improvement_task:handle')) throw forbidden('缺少权限：improvement_task:handle');
  if (process.env.DEMO_MODE === '1') return demoTasks();
  return listByAssignee(auth.id);
}

export async function listBySourceView(auth: AuthView, source = 'drg_attribution') {
  if (!auth.permissions.includes('improvement_task:assign')) throw forbidden('缺少权限：improvement_task:assign');
  if (process.env.DEMO_MODE === '1') return demoTasks().filter(t => t.category === source || source === 'all');
  return listBySource(source);
}

/** 状态流转：医生只能处理分派给自己的；质控 assign 权限可验证闭环。 */
export async function transitionView(
  auth: AuthView,
  taskId: string,
  to: TaskStatus,
  resolutionNote?: string,
) {
  if (!UUID_RE.test(taskId.trim())) throw notFound('任务不存在');
  const task = await getTask(taskId);
  if (!task) throw notFound('任务不存在');

  // 医生处理：只能是分派给自己的，且需 handle 权限
  if (task.assigneeId === auth.id) {
    if (!auth.permissions.includes('improvement_task:handle')) throw forbidden('缺少权限：improvement_task:handle');
  } else {
    // 非本人：只有 assign 权限（质控）才能验证闭环
    if (!auth.permissions.includes('improvement_task:assign')) throw forbidden('只能处理分派给自己的任务');
  }

  const from = task.status as TaskStatus;
  if (!canTransition(from, to)) throw conflict(`非法状态跳转：${from} -> ${to}`);

  const r = await transitionStatus(taskId, to, from, resolutionNote ?? null);
  if (!r) throw conflict('任务状态已变更');
  await recordChainAudit(
    { actorId: auth.id, action: 'improvement_task.transition', resourceType: 'clinical_improvement_tasks', resourceId: taskId, result: 'success', riskLevel: 'low', detail: { from, to } },
  );
  return r;
}
