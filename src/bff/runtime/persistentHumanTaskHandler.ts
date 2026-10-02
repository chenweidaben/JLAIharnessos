/**
 * 健澜科技 jlmedaios - 持久化人工任务处理器（M4-D）
 *
 * 在 InMemoryHumanTaskHandler 的进程内 Promise 挂起/恢复机制之上，把人工工单
 * 持久化到 agent.human_tasks：
 *  - createTask：先落 human_tasks（重启也有痕），再在内存中挂起等待；
 *  - BFF 审核端点通过 resolveByDbTaskId 处理工单：更新 human_tasks 并解除内存挂起；
 *  - cancel/cancelAll：同步取消持久化工单与内存等待。
 *
 * 说明：分布式部署可替换为基于 Redis/DB 的纯持久化实现（IHumanTaskHandler 不变）；
 * 本实现适用于单体 BFF，内存负责挂起，数据库负责留痕与审计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  InMemoryHumanTaskHandler,
  HumanTaskCancelledError,
} from '../../orchestrator/engine/humanTaskHandler.js';
import type {
  HumanResolution,
  IHumanTaskHandler,
  PendingHumanTask,
} from '../../orchestrator/engine/runtime.js';
import {
  getHumanTaskById,
  insertHumanTask,
  resolveHumanTask,
  type HumanTaskRecord,
} from '../../db/repositories/humanTaskRepo.js';

export class PersistentHumanTaskHandler implements IHumanTaskHandler {
  private readonly mem = new InMemoryHumanTaskHandler();
  /** 引擎内存 taskId -> 持久化工单 id */
  private readonly taskIdToDbId = new Map<string, string>();
  /** 持久化工单 id -> 引擎内存 taskId */
  private readonly dbIdToTaskId = new Map<string, string>();

  async createTask(task: PendingHumanTask): Promise<void> {
    const persisted = await insertHumanTask({
      instanceId: task.instanceId,
      nodeId: task.nodeId,
      title: task.title,
      instructions: task.instructions,
      assigneeRoles: task.assigneeRoles,
      assigneeUsers: task.assigneeUserIds,
      formSchema: task.formSchema,
      reviewData: task.reviewData,
    });
    this.link(task.taskId, persisted.id);
    await this.mem.createTask(task);
  }

  waitForResolution(task: PendingHumanTask): Promise<HumanResolution> {
    return this.mem.waitForResolution(task);
  }

  /** IHumanTaskHandler.resolve（按内存 taskId） */
  resolve(taskId: string, resolution: HumanResolution): void {
    this.mem.resolve(taskId, resolution);
  }

  // --------------------------------------------------------------------------
  // BFF 审核端点使用（按持久化工单 id）
  // --------------------------------------------------------------------------

  /** 该工单是否在本进程内存中等待（可在线解除挂起） */
  isLive(dbTaskId: string): boolean {
    const taskId = this.dbIdToTaskId.get(dbTaskId);
    return taskId != null;
  }

  /**
   * 按持久化工单 id 处理（批准/驳回），更新数据库并解除内存挂起。
   * 返回更新后的工单；工单状态不允许（已处理）返回 null。
   */
  async resolveByDbTaskId(
    dbTaskId: string,
    input: {
      approved: boolean;
      reviewerId: string;
      comment?: string;
      formData?: Record<string, unknown>;
    },
  ): Promise<HumanTaskRecord | null> {
    const updated = await resolveHumanTask(dbTaskId, input);
    if (!updated) return null;

    const taskId = this.dbIdToTaskId.get(dbTaskId);
    if (taskId) {
      this.mem.resolve(taskId, {
        taskId,
        approved: input.approved,
        reviewerId: input.reviewerId,
        comment: input.comment,
        formData: input.formData,
      });
      this.unlink(taskId);
    }
    return updated;
  }

  /** 取消单个工单（按内存 taskId，工作流取消时引擎调用） */
  cancelByTaskId(taskId: string): void {
    this.mem.cancel(taskId);
    this.unlink(taskId);
  }

  /** 取消全部待办（引擎实例取消时） */
  cancelAll(): void {
    this.mem.cancelAll();
    this.taskIdToDbId.clear();
    this.dbIdToTaskId.clear();
  }

  /** 列出内存待办（供工单中心在线核对） */
  listPending(filter?: { assigneeRoles?: string[]; assigneeUserIds?: string[] }): PendingHumanTask[] {
    return this.mem.listPending(filter);
  }

  get pendingCount(): number {
    return this.mem.pendingCount;
  }

  private link(taskId: string, dbTaskId: string): void {
    this.taskIdToDbId.set(taskId, dbTaskId);
    this.dbIdToTaskId.set(dbTaskId, taskId);
  }

  private unlink(taskId: string): void {
    const dbId = this.taskIdToDbId.get(taskId);
    this.taskIdToDbId.delete(taskId);
    if (dbId) this.dbIdToTaskId.delete(dbId);
  }
}

export { HumanTaskCancelledError, getHumanTaskById };
