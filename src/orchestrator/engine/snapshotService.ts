/**
 * 健澜AI原生医院操作系统OS - 断点快照服务
 *
 * 持有可选 SnapshotStore 与四维版本台账；在节点完成、人工挂起、暂停、
 * 重试、失败待重试边界落快照；resumePlan 负责定位最近快照并校验续跑迁移。
 * 未注入仓储时由内置进程内存仓储承担，便于后续替换为 DB 持久化实现。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { AiVersionSnapshot } from '@/security/audit/aiAudit.js';
import { WorkflowState } from '../dsl/types.js';
import type { NodeRecord, WorkflowContext } from './context.js';
import {
  buildStateSnapshot,
  validateSnapshotTransition,
  InMemorySnapshotStore,
  type SnapshotStore,
  type SnapshotQuery,
  type StateSnapshot,
  type TimelineMarker,
} from './snapshotStore.js';

/** 快照边界依赖（service 补填四维版本与保存时间） */
export interface SnapshotBoundaryDeps {
  instanceId: string;
  workflowId: string;
  workflowVersion: string;
  state: WorkflowState;
  currentNodeId: string | null;
  completedNodes?: Record<string, NodeRecord>;
  context: WorkflowContext;
  pendingHumanTasks?: string[];
  traceId: string;
  patientId?: string;
  visitId?: string;
  keyNodes?: TimelineMarker[];
}

/** 快照恢复计划 */
export interface SnapshotResumePlan {
  snapshot: StateSnapshot;
  currentNodeId: string | null;
  restoredContext: StateSnapshot['context'];
}

export interface SnapshotServiceOptions {
  store?: SnapshotStore | null;
  versions?: AiVersionSnapshot;
}

const EMPTY_VERSIONS: AiVersionSnapshot = {
  modelId: '',
  modelVersion: '',
  knowledgeVersion: [],
  promptVersion: '',
  platformRelease: '',
};

/** 工作流引擎边界快照服务 */
export class SnapshotService {
  private readonly store: SnapshotStore | null;
  private readonly versions: AiVersionSnapshot;

  constructor(options: SnapshotServiceOptions = {}) {
    this.store = options.store === null ? null : (options.store ?? new InMemorySnapshotStore());
    this.versions = options.versions ?? { ...EMPTY_VERSIONS, knowledgeVersion: [...EMPTY_VERSIONS.knowledgeVersion] };
  }

  /** 节点成功完成边界 */
  onNodeCompleted(deps: SnapshotBoundaryDeps): StateSnapshot | undefined {
    return this.saveBoundary(deps);
  }

  /** 人工任务挂起边界 */
  onHumanWaiting(taskId: string, deps: SnapshotBoundaryDeps): StateSnapshot | undefined {
    const tasks = [...(deps.pendingHumanTasks ?? deps.context.getPendingHumanTasks()), taskId];
    return this.saveBoundary({ ...deps, pendingHumanTasks: tasks });
  }

  /** 外部暂停边界 */
  onPaused(deps: SnapshotBoundaryDeps): StateSnapshot | undefined {
    return this.saveBoundary(deps);
  }

  /** 节点重试边界 */
  onNodeRetrying(nodeId: string, deps: SnapshotBoundaryDeps): StateSnapshot | undefined {
    return this.saveBoundary({ ...deps, currentNodeId: nodeId });
  }

  /** 失败待重试边界 */
  onFailedPendingRetry(deps: SnapshotBoundaryDeps): StateSnapshot | undefined {
    return this.saveBoundary(deps);
  }

  /** 查询最近快照并校验合法续跑迁移；无快照时返回 undefined */
  resumePlan(query: SnapshotQuery): SnapshotResumePlan | undefined {
    if (!this.store) return undefined;
    const snapshot = this.store.findLatest(query);
    if (!snapshot) return undefined;
    validateSnapshotTransition(snapshot, WorkflowState.RUNNING);
    return {
      snapshot,
      currentNodeId: snapshot.currentNodeId,
      restoredContext: snapshot.context,
    };
  }

  private saveBoundary(deps: SnapshotBoundaryDeps): StateSnapshot | undefined {
    if (!this.store) return undefined;
    const completedNodes: Record<string, NodeRecord> = {};
    for (const record of deps.context.getAllRecords()) {
      completedNodes[record.nodeId] = record;
    }
    const snapshot = buildStateSnapshot({
      instanceId: deps.instanceId,
      workflowId: deps.workflowId,
      workflowVersion: deps.workflowVersion,
      state: deps.state,
      currentNodeId: deps.currentNodeId,
      completedNodes: { ...completedNodes, ...deps.completedNodes },
      context: deps.context,
      pendingHumanTasks: deps.pendingHumanTasks ?? deps.context.getPendingHumanTasks(),
      versions: this.versions,
      traceId: deps.traceId,
      patientId: deps.patientId,
      visitId: deps.visitId,
      keyNodes: deps.keyNodes,
    });
    return this.store.save(snapshot);
  }
}
