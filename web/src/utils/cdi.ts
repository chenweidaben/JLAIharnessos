/**
 * 健澜科技 jlmedaios - CDI 用药审查展示工具（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const SEVERITY_LABEL: Record<string, string> = {
  info: '提示',
  warning: '警告',
  block: '拦截',
};

export const SEVERITY_COLOR: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  block: 'red',
};

export const REVIEW_TYPE_LABEL: Record<string, string> = {
  interaction: '相互作用',
  contraindication: '禁忌',
  allergy: '过敏',
  dose: '剂量',
};
