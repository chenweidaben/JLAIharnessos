/**
 * 健澜科技 jlmedaios - 出院计划展示工具（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const STATUS_LABEL: Record<string, string> = {
  planned: '已生成待推送',
  pushed: '已推送患者端',
  completed: '已完成随访',
};

export const STATUS_COLOR: Record<string, string> = {
  planned: 'orange',
  pushed: 'green',
  completed: 'blue',
};
