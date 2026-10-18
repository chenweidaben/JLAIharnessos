/**
 * 健澜科技 jlmedaios - 病历质控专家库管理 V14 聚合器（M474-C）
 *
 * 纯函数：创建专家 + 按科室过滤。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专家 */
export interface ExpertV14 {
  id: string;
  name: string;
  dept: string;
  title: string;
}

/**
 * 创建质控专家。
 *
 * @param name 姓名
 * @param dept 科室
 * @param title 职称
 * @returns 专家
 */
export function buildExpertPool(name: string, dept: string, title: string): ExpertV14 {
  return {
    id: `EXP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    dept,
    title,
  };
}

/**
 * 按科室过滤专家。
 *
 * @param experts 专家列表
 * @param dept 科室名（空字符串返回全部）
 * @returns 过滤后的专家
 */
export function searchExpertsByDept(experts: ExpertV14[], dept: string): ExpertV14[] {
  if (!dept.trim()) return experts;
  return experts.filter((e) => e.dept === dept);
}
