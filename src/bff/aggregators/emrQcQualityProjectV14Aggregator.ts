/**
 * 健澜科技 jlmedaios - 质控质量改进项目 V14 聚合器（M504-B）
 *
 * 纯函数：质量改进项目构建 + 项目增/关闭操作。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量改进项目 */
export interface QualityProjectV14 {
  name: string;
  owner: string;
  status: string;
}

/**
 * 构建质量改进项目。
 *
 * @param name 项目名
 * @param owner 负责人
 * @param status 状态（进行中/已完成/未开始）
 * @returns 质量改进项目
 */
export function buildProject(name: string, owner: string, status: string): QualityProjectV14 {
  return { name, owner, status };
}

/**
 * 添加项目。
 *
 * @param projects 项目数组
 * @param project 新项目
 * @returns 新项目数组（长度+1）
 */
export function addProject(projects: QualityProjectV14[], project: QualityProjectV14): QualityProjectV14[] {
  // 手算 add：返回新数组长度+1
  return [...projects, project];
}

/**
 * 关闭项目（status 改为'已完成'）。
 *
 * @param projects 项目数组
 * @param name 要关闭的项目名
 * @returns 新项目数组（不删除条目，只改状态，长度不变）
 */
export function closeProject(projects: QualityProjectV14[], name: string): QualityProjectV14[] {
  // 手算 close：不删除条目，只把匹配项目的 status 改为'已完成'，数组长度不变
  return projects.map((p) => (p.name === name ? { ...p, status: "已完成" } : p));
}
