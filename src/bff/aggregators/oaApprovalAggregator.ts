/**
 * 健澜科技 jlmedaios - OA 多级审批聚合器（M139-A · 医院运营管理）
 *
 * 【医院运营管理】行政办公（OA）多级审批：请假 / 报销 / 采购 / 用印。
 *   强制三级流转，不能一步到位：
 *     申请人 → 科室主任 → 分管院长 → 人事/财务
 *   末级归口按单据类型分流：
 *     leave(请假) / seal(用印)       → 人事（hr）
 *     expense(报销) / purchase(采购) → 财务（finance）
 *
 * 流程纪律（多级审批，不可跳步）：
 *   - createApproval 一次性铺好 3 个待办节点，currentStep 从 0 起；
 *   - approveStep 每次只推进当前节点一个动作：
 *       · approve：本节点通过，currentStep 前进一格；走到末格才置 approved；
 *       · reject ：本节点驳回，整单即置 rejected，后续节点不再流转；
 *   - 任一节点未处理前，后面节点「不可见、不可办」——从结构上杜绝一步到位；
 *   - 申请人不能审批自己发起的单子（approverId === applicantId 抛错）。
 *
 * 与全仓聚合器约定一致：
 *   - 对外函数核心为组包/状态机推进，入参不被回改；
 *   - 进程内台账 Map 是审批中心列表与流转查询的在读索引；
 *     PostgreSQL 为持久化留痕，落库 best-effort（断库/表未迁移降级，不阻断主流程）。
 *
 * 不触碰 WebSocket，不新增依赖（id 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 审批单据类型：请假 / 报销 / 采购 / 用印（与 clinical.oa_approvals.type CHECK 一致） */
export type ApprovalType = 'leave' | 'expense' | 'purchase' | 'seal';

/** 整单状态 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** 审批人动作：通过 / 驳回 */
export type StepAction = 'approve' | 'reject';

/** 末级归口：人事 / 财务 */
export type FinalRole = 'hr' | 'finance';

/** 单个审批节点（留痕） */
export interface ApprovalStep {
  /** 节点顺序（0 起）：0=科室主任 1=分管院长 2=人事/财务 */
  order: number;
  /** 节点角色名（中文展示） */
  role: string;
  /** 实际处理人；未处理为 null */
  approverId: string | null;
  /** 处理动作；未处理为 null */
  action: StepAction | null;
  /** 审批意见 */
  comment: string;
  /** 处理时间 ISO；未处理为 null */
  actedAt: string | null;
}

/** OA 审批单（BFF 对外形态，camelCase） */
export interface Approval {
  /** 审批单唯一标识 */
  id: string;
  /** 申请人（= iam.users.id） */
  applicantId: string;
  /** 单据类型 */
  type: ApprovalType;
  /** 事由标题 */
  title: string;
  /** 事由正文 */
  content: string;
  /** 整单状态 */
  status: ApprovalStatus;
  /** 下一待办节点下标；== steps.length 表示流程已办结 */
  currentStep: number;
  /** 三级审批节点留痕 */
  steps: ApprovalStep[];
  /** 末级归口 */
  finalRole: FinalRole;
  /** 发起时间 ISO */
  createdAt: string;
  /** 最近变更时间 ISO */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 进程内审批台账（审批中心列表与流转查询的在读索引）                     */
/* ------------------------------------------------------------------ */

const ledger = new Map<string, Approval>();

/** 合法单据类型全集 */
export const APPROVAL_TYPES: readonly ApprovalType[] = ['leave', 'expense', 'purchase', 'seal'];

/** 单据类型中文标签 */
export const APPROVAL_TYPE_LABEL: Record<ApprovalType, string> = {
  leave: '请假',
  expense: '报销',
  purchase: '采购',
  seal: '用印',
};

/** 三级节点固定顺序：科室主任 → 分管院长 → 人事/财务 */
const STEP_ROLE_NAMES: readonly [string, string, string] = ['科室主任', '分管院长', '人事/财务'];

/**
 * 按单据类型定型末级归口：
 *   请假 / 用印 → 人事；报销 / 采购 → 财务。
 */
export function resolveFinalRole(type: ApprovalType): FinalRole {
  return type === 'leave' || type === 'seal' ? 'hr' : 'finance';
}

/** 构造三级待办节点（全部未处理） */
function buildSteps(finalRole: FinalRole): ApprovalStep[] {
  const lastRole = finalRole === 'hr' ? '人事科' : '财务科';
  return STEP_ROLE_NAMES.map((base, order) => ({
    order,
    role: order === STEP_ROLE_NAMES.length - 1 ? lastRole : base,
    approverId: null,
    action: null,
    comment: '',
    actedAt: null,
  }));
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【医院运营管理】发起一张 OA 审批单。
 *
 * 一次性铺好三级待办节点（科室主任 → 分管院长 → 人事/财务），
 * 状态 pending，currentStep=0。多级流程从这里定型——不存在「一步通过」入口。
 *
 * 入参不合法（空申请人 / 非法类型 / 空标题）时抛错，由路由层收敛为 400。
 */
export function createApproval(
  applicantId: string,
  type: ApprovalType,
  title: string,
  content: string,
): Approval {
  if (!applicantId || typeof applicantId !== 'string') {
    throw new Error('申请人 applicantId 不能为空');
  }
  if (!APPROVAL_TYPES.includes(type)) {
    throw new Error(`非法审批类型 type=${String(type)}，须为 ${APPROVAL_TYPES.join(' / ')} 之一`);
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('审批标题 title 不能为空');
  }

  const now = new Date().toISOString();
  const finalRole = resolveFinalRole(type);
  const approval: Approval = {
    id: randomUUID(),
    applicantId,
    type,
    title: title.trim(),
    content: typeof content === 'string' ? content : '',
    status: 'pending',
    currentStep: 0,
    steps: buildSteps(finalRole),
    finalRole,
    createdAt: now,
    updatedAt: now,
  };

  ledger.set(approval.id, approval);
  return approval;
}

/**
 * 【医院运营管理】推进当前审批节点一步（多级流转，不可跳步）。
 *
 * 纪律：
 *   - 仅处理「当前待办节点」一个动作，调用一次只前进一步；
 *   - approve：本节点通过 → currentStep 前进；走完末节点整单 approved；
 *   - reject ：本节点驳回 → 整单 rejected，流程结束；
 *   - 已办结（approved/rejected）的单不可再动；
 *   - 申请人本人不可审批自己的单子。
 *
 * 返回推进后的审批单（副本语义，调用方拿到的是最新快照）。
 */
export function approveStep(
  approvalId: string,
  approverId: string,
  action: StepAction,
  comment: string,
): Approval {
  const approval = ledger.get(approvalId);
  if (!approval) {
    throw new Error(`审批单不存在：${String(approvalId)}`);
  }
  if (approval.status !== 'pending') {
    throw new Error(`审批单已${approval.status === 'approved' ? '办结' : '驳回'}，不可再审批`);
  }
  if (!approverId || typeof approverId !== 'string') {
    throw new Error('审批人 approverId 不能为空');
  }
  if (approverId === approval.applicantId) {
    throw new Error('申请人不可审批自己发起的单子');
  }
  if (action !== 'approve' && action !== 'reject') {
    throw new Error(`非法动作 action=${String(action)}，须为 approve / reject`);
  }
  if (approval.currentStep >= approval.steps.length) {
    throw new Error('审批流程已走完，无可处理节点');
  }

  // 不改原入参对象：复制一份再推进（台账内存单，复制 steps 后写回）
  const next: Approval = {
    ...approval,
    steps: approval.steps.map((s) => ({ ...s })),
  };
  const step = next.steps[next.currentStep];
  step.approverId = approverId;
  step.action = action;
  step.comment = typeof comment === 'string' ? comment : '';
  step.actedAt = new Date().toISOString();

  if (action === 'reject') {
    // 任一节点驳回即整单驳回，后续节点不再流转
    next.status = 'rejected';
    next.currentStep = next.steps.length; // 标记流程结束
  } else {
    // 通过：前进一格；走到末格之后即整单办结
    next.currentStep += 1;
    next.status = next.currentStep >= next.steps.length ? 'approved' : 'pending';
  }
  next.updatedAt = step.actedAt;

  ledger.set(next.id, next);
  return next;
}

/**
 * 【医院运营管理】审批中心列表查询。
 * 不传 applicantId 时返回全部；返回副本，调用方无法借此篡改台账。
 * 按更新时间倒序（最近处理的在前）。
 */
export function listApprovals(applicantId?: string): Approval[] {
  const out: Approval[] = [];
  for (const a of ledger.values()) {
    if (applicantId && a.applicantId !== applicantId) continue;
    out.push({ ...a, steps: a.steps.map((s) => ({ ...s })) });
  }
  out.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  return out;
}

/** 按 id 取审批单快照（副本）；不存在返回 null。 */
export function getApprovalById(approvalId: string): Approval | null {
  const a = ledger.get(approvalId);
  if (!a) return null;
  return { ...a, steps: a.steps.map((s) => ({ ...s })) };
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断                */
/* ------------------------------------------------------------------ */

/**
 * 把审批单（含三级留痕 steps）落库到 clinical.oa_approvals。
 * 由路由层在创建 / 推进后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可支撑审批中心列表与流转。
 */
export async function persistApproval(approval: Approval): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.oa_approvals
        (id, applicant_id, type, title, content, status,
         steps, current_step, final_role, updated_at)
      VALUES
        (${approval.id}, ${approval.applicantId}, ${approval.type},
         ${approval.title}, ${approval.content}, ${approval.status},
         ${JSON.stringify(approval.steps)}::jsonb,
         ${approval.currentStep}, ${approval.finalRole},
         ${approval.updatedAt}::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        status       = EXCLUDED.status,
        steps        = EXCLUDED.steps,
        current_step = EXCLUDED.current_step,
        updated_at   = EXCLUDED.updated_at
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可用，落库留待重连后补写
  }
}
