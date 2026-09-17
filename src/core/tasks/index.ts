/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 任务系统统一导出。
 */

export type { BackgroundTaskHandler, BackgroundTaskStatus } from './BackgroundTaskManager';
export { BackgroundTaskManager } from './BackgroundTaskManager';
export type {
  TaskDefinition,
  TaskHandler,
  TaskPriority,
  TaskQueueEvent,
  TaskRecord,
  TaskState,
} from './TaskQueue';
export { TaskQueue } from './TaskQueue';
