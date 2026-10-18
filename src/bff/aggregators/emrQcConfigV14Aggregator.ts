/**
 * 健澜科技 jlmedaios - 病历质控系统配置 V14 聚合器（M473-D，M473 收官）
 *
 * 纯函数：返回默认配置 + 校验配置合法性。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控系统配置 */
export interface QcConfigV14 {
  passThreshold: number;
  defectDangerThreshold: number;
  autoQcEnabled: boolean;
  reminderEnabled: boolean;
}

/** 配置校验结果 */
export interface QcConfigValidationV14 {
  valid: boolean;
  errors: string[];
}

/**
 * 返回默认质控配置。
 *
 * @returns 默认配置
 */
export function buildQcConfig(): QcConfigV14 {
  return {
    passThreshold: 90,
    defectDangerThreshold: 10,
    autoQcEnabled: true,
    reminderEnabled: true,
  };
}

/**
 * 校验配置合法性。
 * passThreshold 必须在 0-100 之间；defectDangerThreshold 必须在 0-100 之间。
 *
 * @param config 配置
 * @returns 校验结果
 */
export function validateQcConfig(config: QcConfigV14): QcConfigValidationV14 {
  const errors: string[] = [];
  if (config.passThreshold < 0 || config.passThreshold > 100) {
    errors.push("passThreshold 必须在 0-100 之间");
  }
  if (config.defectDangerThreshold < 0 || config.defectDangerThreshold > 100) {
    errors.push("defectDangerThreshold 必须在 0-100 之间");
  }
  return { valid: errors.length === 0, errors };
}
