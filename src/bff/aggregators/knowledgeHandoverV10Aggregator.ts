/**
 * 健澜科技 jlmedaios - 个人知识图谱与继任者交接 V10 纯函数（M292-C）
 *
 * buildKnowledgeGraphV10 / buildHandoverPackageV10 / rankHandoverPriorityV10
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生知识图谱 */
export interface DoctorGraphV10 {
  doctorId: string;
  dept: string;
  specialtyCount: number;
  successCount: number;
  failureCount: number;
  practiceCount: number;
  knowledgeDensity: number;
}

/**
 * 个人知识图谱 V10（纯函数）：统计专长/成功/失败/实践数量，knowledgeDensity = success+practice - failure。
 *
 * @param doctorId 医生ID
 * @param dept 科室
 * @param successCount 成功案例数
 * @param failureCount 失败案例数
 * @param practiceCount 最佳实践数
 * @param specialties 专长领域列表
 * @returns 知识图谱
 */
export function buildKnowledgeGraphV10(
  doctorId: string,
  dept: string,
  successCount: number,
  failureCount: number,
  practiceCount: number,
  specialties: string[],
): DoctorGraphV10 {
  const knowledgeDensity = successCount + practiceCount - failureCount;
  return {
    doctorId,
    dept,
    specialtyCount: specialties.length,
    successCount,
    failureCount,
    practiceCount,
    knowledgeDensity,
  };
}

/**
 * 交接包 V10（纯函数）：把知识图谱打包为结构化文档。
 *
 * @param fromDoctor 原医生
 * @param toDoctor 继任医生
 * @param graph 知识图谱
 * @returns 交接包
 */
export function buildHandoverPackageV10(
  fromDoctor: string,
  toDoctor: string,
  graph: DoctorGraphV10,
): {
  handoverId: string;
  fromDoctor: string;
  toDoctor: string;
  dept: string;
  summary: string;
  graph: DoctorGraphV10;
} {
  return {
    handoverId: `ho-${fromDoctor}-to-${toDoctor}`,
    fromDoctor,
    toDoctor,
    dept: graph.dept,
    summary: `${fromDoctor} → ${toDoctor}：${graph.specialtyCount}个专长领域，${graph.successCount}个成功案例，${graph.failureCount}个失败教训，${graph.practiceCount}条最佳实践。`,
    graph,
  };
}

/**
 * 交接优先级 V10（纯函数）：按 knowledgeDensity 降序。
 *
 * @param graphs 知识图谱列表
 * @returns 排序后列表
 */
export function rankHandoverPriorityV10(graphs: DoctorGraphV10[]): DoctorGraphV10[] {
  return [...graphs].sort((a, b) => b.knowledgeDensity - a.knowledgeDensity);
}
