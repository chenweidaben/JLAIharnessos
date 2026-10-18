/**
 * 健澜科技 jlmedaios - 质控系统参数配置明细 V14 聚合器（M507-A，-detail 避让）
 *
 * 纯函数：系统参数构建 + 设置参数 + 查询参数。
 * 避让说明：M498-A 已有 emrQcSysParamV14（key/value 两字段），本切片三字段含 desc，改用 -detail 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 系统参数（明细：含描述） */
export interface SysParamDetailV14 {
  key: string;
  value: string;
  desc: string;
}

/**
 * 构建系统参数。
 *
 * @param key 参数名
 * @param value 参数值
 * @param desc 参数描述
 * @returns 系统参数
 */
export function buildParam(key: string, value: string, desc: string): SysParamDetailV14 {
  return { key, value, desc };
}

/**
 * 设置参数（新增或更新，相同 key 覆盖）。
 *
 * @param params 参数数组
 * @param param 新参数
 * @returns 新参数数组
 */
export function setParam(params: SysParamDetailV14[], param: SysParamDetailV14): SysParamDetailV14[] {
  // 手算 setParam：相同 key 覆盖，否则追加
  const existing = params.find((p) => p.key === param.key);
  if (existing) {
    return params.map((p) => (p.key === param.key ? param : p));
  }
  return [...params, param];
}

/**
 * 查询参数（按 key 精确查找）。
 *
 * @param params 参数数组
 * @param key 参数名
 * @returns 匹配的参数，未找到返回 undefined
 */
export function getParam(params: SysParamDetailV14[], key: string): SysParamDetailV14 | undefined {
  // 手算 getParam：按 key 精确查找
  return params.find((p) => p.key === key);
}
