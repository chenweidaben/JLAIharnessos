/**
 * 健澜科技 jlmedaios - AI 治理台账 V13 纯函数（M325-D）
 *
 * listDeployedAiModelsV13 / countPendingApprovalV13 / countRollbackTimesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 模型记录 */
export interface AiModelRecordV13 {
  modelName: string;
  version: string;
  deployDate: string;
  isPendingApproval: boolean;
  rollbackCount: number;
}

/** 已上线模型清单项 */
export interface DeployedModelItemV13 {
  modelName: string;
  version: string;
  deployDate: string;
}

/**
 * 已上线 AI 模型清单（纯函数）：模型名/版本/上线时间。
 *
 * @param models 模型记录列表
 * @returns 模型清单
 */
export function listDeployedAiModelsV13(models: AiModelRecordV13[]): DeployedModelItemV13[] {
  return models.map((m) => ({
    modelName: m.modelName,
    version: m.version,
    deployDate: m.deployDate,
  }));
}

/**
 * 监管审批待批数（纯函数）：统计待批模型数。
 *
 * @param models 模型记录列表
 * @returns 待批数
 */
export function countPendingApprovalV13(models: AiModelRecordV13[]): number {
  return models.filter((m) => m.isPendingApproval).length;
}

/**
 * 版本回滚次数（纯函数）：汇总所有模型回滚次数。
 *
 * @param models 模型记录列表
 * @returns 总回滚次数
 */
export function countRollbackTimesV13(models: AiModelRecordV13[]): number {
  return models.reduce((acc, m) => acc + m.rollbackCount, 0);
}
