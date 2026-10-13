/**
 * 健澜科技 jlmedaios - MDT 展示工具（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const STATUS_LABEL: Record<string, string> = {
  requested: '已申请',
  scheduled: '已排期',
  held: '已召开',
  concluded: '已结论',
  cancelled: '已取消',
};

export const STATUS_COLOR: Record<string, string> = {
  requested: 'orange',
  scheduled: 'blue',
  held: 'cyan',
  concluded: 'green',
  cancelled: 'red',
};
