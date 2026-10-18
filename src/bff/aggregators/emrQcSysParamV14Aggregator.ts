/**
 * 健澜科技 jlmedaios - 质控系统参数配置 V14 聚合器（M498-A）
 *
 * 纯函数：系统参数构建 + 系统参数校验。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 系统参数 */
export interface SysParamV14 {
  key: string;
  value: string;
}

/** 参数校验结果 */
export interface SysParamValidationV14 {
  valid: boolean;
  errors: string[];
}

/**
 * 构建系统参数。
 *
 * @param key 参数名
 * @param value 参数值
 * @returns 系统参数
 */
export function buildSysParam(key: string, value: string): SysParamV14 {
  return { key, value };
}

/**
 * 校验系统参数（key/value 必填字符串）。
 *
 * @param param 系统参数
 * @returns 校验结果
 */
export function validateSysParam(param: SysParamV14): SysParamValidationV14 {
  // 手算校验：key/value 必填字符串
  const errors: string[] = [];
  if (!param.key) {
    errors.push("key 必填");
  }
  if (!param.value) {
    errors.push("value 必填");
  }
  return { valid: errors.length === 0, errors };
}
