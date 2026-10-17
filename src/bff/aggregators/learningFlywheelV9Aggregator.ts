/**
 * 健澜科技 jlmedaios - 跨角色经验复用与学习飞轮 V9 纯函数（M291-D）
 *
 * transferLessonV9 / filterApplicableLessonsV9 / buildLearningFlywheelV9
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 转译后的经验 */
export interface TransferredLessonV9 {
  id: string;
  sourceRole: "doctor" | "nurse" | "pharma" | "manager";
  targetRole: "doctor" | "nurse" | "pharma" | "manager";
  condition: string;
  lesson: string;
  sourceCnt: number;
}

/**
 * 经验转译 V9（纯函数）：把医生经验打标 sourceRole→targetRole。
 *
 * @param sourceRole 源角色
 * @param targetRole 目标角色
 * @param lessons 待转译经验（条件+教训+来源次数）
 * @returns 转译后经验
 */
export function transferLessonV9(
  sourceRole: TransferredLessonV9["sourceRole"],
  targetRole: TransferredLessonV9["targetRole"],
  lessons: { condition: string; lesson: string; sourceCnt: number }[],
): TransferredLessonV9[] {
  return lessons.map((l, idx) => ({
    id: `tl-${sourceRole}-to-${targetRole}-${idx}`,
    sourceRole,
    targetRole,
    condition: l.condition,
    lesson: l.lesson,
    sourceCnt: l.sourceCnt,
  }));
}

/**
 * 适用经验过滤 V9（纯函数）：仅返回 targetRole 匹配的经验。
 *
 * @param lessons 经验库
 * @param targetRole 目标角色
 * @param context 上下文（当前场景，保留接口位）
 * @returns 适用经验
 */
export function filterApplicableLessonsV9(
  lessons: TransferredLessonV9[],
  targetRole: TransferredLessonV9["targetRole"],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: Record<string, unknown>,
): TransferredLessonV9[] {
  return lessons.filter((l) => l.targetRole === targetRole);
}

/**
 * 学习飞轮统计 V9（纯函数）：transferCount/targetRoles/highTransferCount。
 *
 * @param lessons 经验库
 * @returns 飞轮统计
 */
export function buildLearningFlywheelV9(lessons: TransferredLessonV9[]): {
  transferCount: number;
  targetRoleCount: number;
  highTransferCount: number;
} {
  const targetRoles = new Set(lessons.map((l) => l.targetRole));
  return {
    transferCount: lessons.length,
    targetRoleCount: targetRoles.size,
    highTransferCount: lessons.filter((l) => l.sourceCnt >= 3).length,
  };
}
