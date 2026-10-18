/**
 * 健澜科技 jlmedaios - 质控指标采集 V14 聚合器（M483-A）
 *
 * 纯函数：采集任务构建 + 执行采集。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 采集任务 */
export interface CollectTaskV14 {
  taskName: string;
  source: string;
}

/** 采集结果 */
export interface CollectResultV14 {
  taskName: string;
  source: string;
  collectedRecords: number;
}

/**
 * 构建采集任务。
 *
 * @param taskName 任务名
 * @param source 数据源
 * @returns 采集任务
 */
export function buildCollectTask(taskName: string, source: string): CollectTaskV14 {
  return { taskName, source };
}

/**
 * 执行采集：返回采集记录数。
 *
 * @param task 采集任务
 * @param records 待采集记录数
 * @returns 采集结果
 */
export function collectQcMetric(task: CollectTaskV14, records: number): CollectResultV14 {
  return {
    taskName: task.taskName,
    source: task.source,
    collectedRecords: records,
  };
}
