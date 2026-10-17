/**
 * 健澜科技 jlmedaios - 隐私计算与联邦学习 V5 纯函数（M282-D）
 *
 * initFederatedV5 / aggregateModelV5 / evalFederatedV5 / buildFederatedLearningV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 联邦任务 */
export interface FederatedTask {
  taskName: string;
  orgs: string[];
  modelType: string;
  rounds: number;
}

/** 各机构本地模型更新 */
export interface ModelUpdate {
  org: string;
  weights: number[];
  sampleSize: number;
}

/** 联邦评估 */
export interface FederatedEval {
  globalAccuracy: number;
  localAccuracies: Record<string, number>;
}

/**
 * 初始化联邦任务 V5（纯函数）。
 *
 * @param task 任务
 * @returns 初始化结果
 */
export function initFederatedV5(task: FederatedTask): { taskId: string; status: string; participatingOrgs: number } {
  return {
    taskId: `fed-${task.modelType}-${Date.now()}`,
    status: "initialized",
    participatingOrgs: task.orgs.length,
  };
}

/**
 * 模型聚合 V5（纯函数）：按样本量加权平均。
 *
 * @param updates 各机构更新
 * @returns 全局权重
 */
export function aggregateModelV5(updates: ModelUpdate[]): { globalWeights: number[]; totalSamples: number } {
  const totalSamples = updates.reduce((s, u) => s + u.sampleSize, 0);
  if (totalSamples === 0) return { globalWeights: [], totalSamples: 0 };
  const dim = updates[0].weights.length;
  const globalWeights: number[] = new Array(dim).fill(0);
  for (const u of updates) {
    const weight = u.sampleSize / totalSamples;
    for (let i = 0; i < dim; i++) {
      globalWeights[i] += u.weights[i] * weight;
    }
  }
  return {
    globalWeights: globalWeights.map((w) => Math.round(w * 1000) / 1000),
    totalSamples,
  };
}

/**
 * 联邦评估 V5（纯函数）：全局与本地准确率对比。
 *
 * @param evalResult 评估结果
 * @returns 是否达成全局收益
 */
export function evalFederatedV5(evalResult: FederatedEval): { avgLocal: number; globalGain: number; beneficial: boolean } {
  const locals = Object.values(evalResult.localAccuracies);
  const avgLocal = locals.length > 0 ? Math.round((locals.reduce((s, v) => s + v, 0) / locals.length) * 1000) / 1000 : 0;
  const globalGain = Math.round((evalResult.globalAccuracy - avgLocal) * 1000) / 1000;
  return { avgLocal, globalGain, beneficial: globalGain > 0 };
}

/** 联邦看板输出 */
export interface FederatedLearningV5Report {
  totalTasks: number;
  totalOrgs: number;
  avgGlobalAccuracy: number;
}

/**
 * 构建联邦看板（纯函数）。
 *
 * @param tasks 任务列表
 * @param evals 评估列表
 * @returns 看板
 */
export function buildFederatedLearningV5Report(tasks: FederatedTask[], evals: FederatedEval[]): FederatedLearningV5Report {
  const totalOrgs = tasks.reduce((s, t) => s + t.orgs.length, 0);
  const avgGlobalAccuracy = evals.length > 0
    ? Math.round((evals.reduce((s, e) => s + e.globalAccuracy, 0) / evals.length) * 1000) / 1000
    : 0;
  return { totalTasks: tasks.length, totalOrgs, avgGlobalAccuracy };
}
