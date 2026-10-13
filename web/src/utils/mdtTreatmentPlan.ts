/**
 * 健澜科技 jlmedaios - MDT 治疗方案展示工具（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const PLAN_TYPE_LABEL: Record<string, string> = {
  chemotherapy: '化疗',
  surgery: '手术',
  radiotherapy: '放疗',
  targeted: '靶向',
  immunotherapy: '免疫',
  supportive: '支持治疗',
};

export const PLAN_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  cancelled: '已取消',
};

export const PLAN_STATUS_COLOR: Record<string, string> = {
  draft: 'orange',
  confirmed: 'green',
  cancelled: 'red',
};
