/**
 * 健澜科技 jlmedaios - 质控整改验证 V14 聚合器（M496-B）
 *
 * 纯函数：整改结果验证 + 验证报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 整改验证结果 */
export interface RectifyVerifyV14 {
  issue: string;
  result: string;
}

/** 验证报告 */
export interface VerifyReportV14 {
  verified: number;
  total: number;
  passRate: number;
}

/**
 * 验证整改结果（通过/不通过）。
 *
 * @param issue 问题
 * @param result 验证结果（通过/不通过）
 * @returns 整改验证结果
 */
export function verifyRectification(issue: string, result: string): RectifyVerifyV14 {
  return { issue, result };
}

/**
 * 构建验证报告（verified/total/passRate%）。
 *
 * @param verified 已验证通过数
 * @param total 总验证数
 * @returns 验证报告
 */
export function buildVerifyReport(verified: number, total: number): VerifyReportV14 {
  if (total === 0) {
    return { verified: 0, total: 0, passRate: 0 };
  }
  // 手算通过率：passRate=Math.ceil(verified/total×100)，分母不能为 0
  const passRate = Math.ceil((verified / total) * 100);
  return { verified, total, passRate };
}
