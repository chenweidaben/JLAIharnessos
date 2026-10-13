/**
 * 健澜科技 jlmedaios - 输血反应展示工具（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const REACTION_TYPE_LABEL: Record<string, string> = {
  fever: '发热反应',
  allergy: '过敏反应',
  hemolysis: '溶血反应',
  taco: '循环超负荷',
  other: '其他',
};

export const SEVERITY_LABEL: Record<string, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
};

export const SEVERITY_COLOR: Record<string, string> = {
  mild: 'green',
  moderate: 'orange',
  severe: 'red',
};
