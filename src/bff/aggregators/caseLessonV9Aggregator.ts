/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人经验沉淀闭环 V9 纯函数（M291-C）
 *
 * logCaseLessonV9 / searchRelevantCasesV9 / buildDoctorLegacyV9
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 案例教训 */
export interface CaseLessonV9 {
  id: string;
  doctorId: string;
  patientCase: string;
  diagnosis: string;
  outcome: string;
  success: boolean;
  tag: string;
}

/**
 * 记录案例 V9（纯函数）：不可变追加，返回新数组。
 *
 * @param doctorId 医生ID
 * @param caseData 案例数据（不含 id）
 * @param history 历史案例
 * @returns 新历史数组
 */
export function logCaseLessonV9(
  doctorId: string,
  caseData: Omit<CaseLessonV9, "id" | "doctorId">,
  history: CaseLessonV9[],
): CaseLessonV9[] {
  const next: CaseLessonV9 = {
    id: `case-${Date.now()}-${history.length}`,
    doctorId,
    ...caseData,
  };
  return [...history, next];
}

/**
 * 相关案例检索 V9（纯函数）：诊断关键词包含 condition 即命中，成功优先排序。
 *
 * @param history 案例库
 * @param condition 诊断关键词
 * @returns 检索结果（成功优先）
 */
export function searchRelevantCasesV9(history: CaseLessonV9[], condition: string): CaseLessonV9[] {
  return history
    .filter((c) => c.diagnosis.includes(condition))
    .sort((a, b) => Number(b.success) - Number(a.success));
}

/**
 * 个人经验遗产 V9（纯函数）：successCount/failCount/topConditions。
 *
 * @param history 该医生的案例库
 * @returns 遗产摘要
 */
export function buildDoctorLegacyV9(history: CaseLessonV9[]): {
  total: number;
  successCount: number;
  failCount: number;
  topConditions: string[];
} {
  const successCount = history.filter((c) => c.success).length;
  const failCount = history.length - successCount;
  const condCount = new Map<string, number>();
  for (const c of history) {
    condCount.set(c.diagnosis, (condCount.get(c.diagnosis) ?? 0) + 1);
  }
  const topConditions = Array.from(condCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
  return {
    total: history.length,
    successCount,
    failCount,
    topConditions,
  };
}
