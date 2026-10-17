/**
 * 健澜科技 jlmedaios - 大模型微调与人在环反馈 V5 纯函数（M280-D）
 *
 * prepareTrainDataV5 / assessFinetuneV5 / loopFeedbackV5 / buildFinetuneLoopV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人在环反馈 */
export interface HumanFeedback {
  adviceId: string;
  accepted: boolean;
  rejected: boolean;
  correction: string;
  reviewer: string;
}

/**
 * 训练数据准备 V5（纯函数）：被接受或人工修正的样本入训练集。
 *
 * @param feedback 反馈列表
 * @returns 训练样本数与分布
 */
export function prepareTrainDataV5(feedback: HumanFeedback[]): { samples: number; acceptedCount: number; correctedCount: number } {
  let acceptedCount = 0;
  let correctedCount = 0;
  for (const f of feedback) {
    if (f.accepted) acceptedCount += 1;
    if (f.correction.length > 0) correctedCount += 1;
  }
  const samples = acceptedCount + correctedCount;
  return { samples, acceptedCount, correctedCount };
}

/**
 * 微调效果评估 V5（纯函数）：准确率提升幅度。
 *
 * @param before 微调前准确率
 * @param after 微调后准确率
 * @returns 提升与是否达标
 */
export function assessFinetuneV5(before: number, after: number): { improvement: number; improved: boolean; targetMet: boolean } {
  const improvement = Math.round((after - before) * 100) / 100;
  return {
    improvement,
    improved: after > before,
    targetMet: after >= before + 5,
  };
}

/**
 * 反馈闭环 V5（纯函数）：高优先级未处理反馈数。
 *
 * @param feedback 反馈列表
 * @returns 闭环统计
 */
export function loopFeedbackV5(feedback: HumanFeedback[]): { total: number; pending: number; resolved: number; correctionRate: number } {
  const total = feedback.length;
  const resolved = feedback.filter((f) => f.accepted || f.rejected).length;
  const pending = total - resolved;
  const correctionRate = total > 0
    ? Math.round((feedback.filter((f) => f.correction.length > 0).length / total) * 1000) / 10
    : 0;
  return { total, pending, resolved, correctionRate };
}

/** 微调看板输出 */
export interface FinetuneLoopV5Report {
  totalFeedback: number;
  pendingFeedback: number;
  trainSamples: number;
  avgImprovement: number;
  suggestions: string[];
}

/**
 * 构建微调看板（纯函数）。
 *
 * @param feedback 反馈列表
 * @param improvements 各次微调提升幅度
 * @returns 看板
 */
export function buildFinetuneLoopV5Report(feedback: HumanFeedback[], improvements: number[]): FinetuneLoopV5Report {
  const loop = loopFeedbackV5(feedback);
  const train = prepareTrainDataV5(feedback);
  const avgImprovement = improvements.length > 0
    ? Math.round((improvements.reduce((s, v) => s + v, 0) / improvements.length) * 100) / 100
    : 0;
  return {
    totalFeedback: loop.total,
    pendingFeedback: loop.pending,
    trainSamples: train.samples,
    avgImprovement,
    suggestions: loop.pending > 0
      ? [`${loop.pending} 条反馈待处理，需人工标注后回灌微调`]
      : ["反馈闭环运转良好，持续微调"],
  };
}
