/**
 * 健澜科技 jlmedaios - 质控移动端整改 V14 聚合器（M526-D，M526 收官）
 *
 * 纯函数：构建移动端整改基础数据 + 移动端整改 + 构建整改报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 移动端整改基础数据 */
export interface MobileRectifyV14 {
  defectId: string;
  rectifier: string;
}

/** 整改输入 */
export interface MobileRectifyInputV14 {
  defectId: string;
  rectifyContent: string;
  isResolved: boolean;
}

/** 整改结果 */
export interface MobileRectifyResultV14 {
  resolved: boolean;
  rectifyScore: number;
}

/** 整改报告 */
export interface MobileRectifyReportV14 {
  resolved: boolean;
  rectifyScore: number;
  grade: string;
}

/**
 * 构建移动端整改基础数据。
 *
 * @param defectId 缺陷ID
 * @param rectifier 整改人
 * @returns 移动端整改基础数据
 */
export function buildMobileRectify(defectId: string, rectifier: string): MobileRectifyV14 {
  return { defectId, rectifier };
}

/**
 * 移动端整改。
 * resolved = isResolved；rectifyScore = isResolved ? 100 : Math.min(60, rectifyContent.length)。
 *
 * @param input 整改输入（缺陷ID + 整改内容 + 是否解决）
 * @returns 整改结果（resolved + rectifyScore）
 */
export function rectifyOnMobile(input: MobileRectifyInputV14): MobileRectifyResultV14 {
  // 手算：resolved = isResolved
  // 测试2：isResolved=true → resolved=true
  // 测试3：isResolved=false → resolved=false
  const resolved = input.isResolved;
  // 手算：rectifyScore = isResolved ? 100 : Math.min(60, rectifyContent.length)
  // 测试2：isResolved=true → rectifyScore=100
  // 测试3：isResolved=false, rectifyContent='处理中'(3字) → Math.min(60, 3) = 3
  //        注：规格原文期望 4，实际 '处理中'.length=3，按实际逻辑修正为 3
  const rectifyScore = input.isResolved ? 100 : Math.min(60, input.rectifyContent.length);
  return { resolved, rectifyScore };
}

/**
 * 构建整改报告。
 * rectifyScore >= 90 → '整改优秀'，>= 60 → '整改合格'，否则 '整改待改进'。
 *
 * @param result 整改结果
 * @returns 整改报告（resolved + rectifyScore + grade）
 */
export function buildMobileRectifyReport(result: MobileRectifyResultV14): MobileRectifyReportV14 {
  // 手算：rectifyScore >= 90 → '整改优秀'，>= 60 → '整改合格'，否则 '整改待改进'
  // 测试4：rectifyScore=100 >= 90 → grade='整改优秀'
  let grade: string;
  if (result.rectifyScore >= 90) {
    grade = "整改优秀";
  } else if (result.rectifyScore >= 60) {
    grade = "整改合格";
  } else {
    grade = "整改待改进";
  }
  return { resolved: result.resolved, rectifyScore: result.rectifyScore, grade };
}
