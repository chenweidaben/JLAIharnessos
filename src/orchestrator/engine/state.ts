/**
 * 健澜科技杠OS - 工作流状态机
 *
 * 约束工作流实例的合法状态迁移，杜绝非法跃迁（如已完成的实例被再次暂停）。
 *
 * 合法迁移图：
 *   draft      -> validated
 *   validated  -> running
 *   running    -> waiting_human | paused | completed | failed | cancelled
 *   waiting_human -> running（人工恢复）| failed（超时）| cancelled
 *   paused     -> running（恢复）| cancelled
 *   completed / failed / cancelled 为终态
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { WorkflowState } from '../dsl/types.js';

/** 状态迁移非法错误 */
export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly from: WorkflowState,
    public readonly to: WorkflowState,
  ) {
    super(`非法的工作流状态迁移: ${from} -> ${to}`);
    this.name = 'IllegalStateTransitionError';
  }
}

/** 合法迁移表 */
const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.DRAFT]: [WorkflowState.VALIDATED, WorkflowState.FAILED],
  [WorkflowState.VALIDATED]: [WorkflowState.RUNNING, WorkflowState.DRAFT, WorkflowState.CANCELLED],
  [WorkflowState.RUNNING]: [
    WorkflowState.WAITING_HUMAN,
    WorkflowState.PAUSED,
    WorkflowState.COMPLETED,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.WAITING_HUMAN]: [
    WorkflowState.RUNNING,
    WorkflowState.PAUSED,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.PAUSED]: [WorkflowState.RUNNING, WorkflowState.CANCELLED, WorkflowState.FAILED],
  [WorkflowState.COMPLETED]: [],
  [WorkflowState.FAILED]: [WorkflowState.VALIDATED], // 允许修复后重跑
  [WorkflowState.CANCELLED]: [WorkflowState.VALIDATED],
};

/** 终态集合 */
const TERMINAL_STATES = new Set<WorkflowState>([
  WorkflowState.COMPLETED,
  WorkflowState.FAILED,
  WorkflowState.CANCELLED,
]);

/**
 * 工作流状态机
 */
export class WorkflowStateMachine {
  private current: WorkflowState;

  constructor(initial: WorkflowState = WorkflowState.DRAFT) {
    this.current = initial;
  }

  get state(): WorkflowState {
    return this.current;
  }

  /** 是否可以迁移到目标状态 */
  canTransitionTo(to: WorkflowState): boolean {
    return ALLOWED_TRANSITIONS[this.current].includes(to);
  }

  /** 执行迁移，非法则抛错 */
  transition(to: WorkflowState): WorkflowState {
    if (!this.canTransitionTo(to)) {
      throw new IllegalStateTransitionError(this.current, to);
    }
    this.current = to;
    return this.current;
  }

  /** 是否终态 */
  get isTerminal(): boolean {
    return TERMINAL_STATES.has(this.current);
  }

  /** 是否可被执行 */
  get isRunnable(): boolean {
    return this.current === WorkflowState.VALIDATED || this.current === WorkflowState.PAUSED;
  }

  /** 是否可恢复（人工挂起/暂停） */
  get isResumable(): boolean {
    return this.current === WorkflowState.WAITING_HUMAN || this.current === WorkflowState.PAUSED;
  }
}
