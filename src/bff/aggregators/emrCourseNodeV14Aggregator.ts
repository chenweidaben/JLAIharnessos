/**
 * 健澜科技 jlmedaios - 病程关键节点标记 V14 聚合器（M538-B）
 *
 * 纯函数：构建关键节点基础数据 + 节点标记 + 构建节点报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 关键节点基础数据 */
export interface CourseNodeV14 {
  recordId: string;
  dept: string;
}

/** 节点标记输入 */
export interface CourseNodeInputV14 {
  nodeType: "入院" | "手术" | "转出" | "出院";
  day: number;
}

/** 节点标记结果 */
export interface CourseNodeResultV14 {
  marked: boolean;
  nodeLabel: string;
}

/** 节点报告 */
export interface CourseNodeReportV14 {
  marked: boolean;
  nodeLabel: string;
}

/**
 * 构建关键节点基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 关键节点基础数据
 */
export function buildCourseNode(recordId: string, dept: string): CourseNodeV14 {
  return { recordId, dept };
}

/**
 * 节点标记。
 * marked = true
 * nodeLabel = day + '天·' + nodeType
 *
 * @param input 标记输入（节点类型 + 天数）
 * @returns 标记结果（marked + nodeLabel）
 */
export function markCourseNode(input: CourseNodeInputV14): CourseNodeResultV14 {
  // 手算：marked = true
  // 测试2：nodeType='手术', day=3 → marked=true
  // 测试3：nodeType='出院', day=10 → marked=true
  const marked = true;
  // 手算：nodeLabel = day + '天·' + nodeType
  // 测试2：day=3, nodeType='手术' → '3天·手术'
  // 测试3：day=10, nodeType='出院' → '10天·出院'
  const nodeLabel = input.day + "天·" + input.nodeType;
  return { marked, nodeLabel };
}

/**
 * 构建节点报告。
 *
 * @param result 标记结果
 * @returns 节点报告（marked + nodeLabel 透传）
 */
export function buildCourseNodeReport(result: CourseNodeResultV14): CourseNodeReportV14 {
  // 手算：透传 marked + nodeLabel
  // 测试4：{marked=true, nodeLabel='3天·手术'} → marked=true, nodeLabel='3天·手术'
  return { marked: result.marked, nodeLabel: result.nodeLabel };
}
