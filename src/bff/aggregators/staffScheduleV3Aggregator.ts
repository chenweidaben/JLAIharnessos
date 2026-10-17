/**
 * 健澜科技 jlmedaios - 人力排班与调度优化 V3 纯函数（M277-D）
 *
 * optimizeScheduleV3 / matchSkillV3 / fairnessScoreV3 / buildStaffScheduleV3Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 岗位需求 */
export interface ShiftDemand {
  date: string;
  shift: string;
  required: number;
  requiredSkill: string;
}

/** 员工 */
export interface Staff {
  staffId: string;
  name: string;
  skills: string[];
  shiftCount: number;
}

/** 排班结果 */
export interface ScheduleAssignment {
  date: string;
  shift: string;
  staffId: string;
  skillMatched: boolean;
}

/**
 * 技能匹配 V3（纯函数）：员工是否具备班次所需技能。
 *
 * @param shiftSkill 班次所需技能
 * @param staff 员工
 * @returns 是否匹配
 */
export function matchSkillV3(shiftSkill: string, staff: Staff): boolean {
  return staff.skills.includes(shiftSkill);
}

/**
 * 排班优化 V3（纯函数）：按需求分配技能匹配且 shiftCount 最少的员工。
 *
 * @param demand 岗位需求
 * @param staff 员工池
 * @returns 排班分配列表
 */
export function optimizeScheduleV3(demand: ShiftDemand[], staff: Staff[]): ScheduleAssignment[] {
  const assignments: ScheduleAssignment[] = [];
  const used = new Set<string>();
  for (const d of demand) {
    let assigned = 0;
    const candidates = staff
      .filter((s) => matchSkillV3(d.requiredSkill, s))
      .sort((a, b) => a.shiftCount - b.shiftCount);
    for (const c of candidates) {
      if (assigned >= d.required) break;
      const key = `${c.staffId}-${d.date}-${d.shift}`;
      if (used.has(key)) continue;
      used.add(key);
      assignments.push({ date: d.date, shift: d.shift, staffId: c.staffId, skillMatched: true });
      c.shiftCount += 1;
      assigned += 1;
    }
  }
  return assignments;
}

/**
 * 公平性评分 V3（纯函数）：基于 shiftCount 标准差，越接近100越公平。
 *
 * @param assignments 排班结果
 * @param staff 员工池
 * @returns 公平性分
 */
export function fairnessScoreV3(assignments: ScheduleAssignment[], staff: Staff[]): number {
  const counts = staff.map((s) => s.shiftCount);
  if (counts.length === 0) return 100;
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((s, c) => s + (c - avg) ** 2, 0) / counts.length;
  const std = Math.sqrt(variance);
  const score = Math.max(0, Math.round(100 - std * 20));
  return score;
}

/** 排班报告输出 */
export interface StaffScheduleV3Report {
  totalAssignments: number;
  skillMatchedCount: number;
  fairnessScore: number;
  coverageRate: number;
  suggestions: string[];
}

/**
 * 构建排班报告（纯函数）。
 *
 * @param assignments 排班结果
 * @param demand 总需求数
 * @param staff 员工池
 * @returns 报告
 */
export function buildStaffScheduleV3Report(
  assignments: ScheduleAssignment[],
  demand: ShiftDemand[],
  staff: Staff[],
): StaffScheduleV3Report {
  const totalRequired = demand.reduce((s, d) => s + d.required, 0);
  const coverageRate = totalRequired > 0
    ? Math.round((assignments.length / totalRequired) * 1000) / 10
    : 0;
  const skillMatchedCount = assignments.filter((a) => a.skillMatched).length;
  const fairness = fairnessScoreV3(assignments, staff);
  return {
    totalAssignments: assignments.length,
    skillMatchedCount,
    fairnessScore: fairness,
    coverageRate,
    suggestions: coverageRate < 90
      ? ["技能匹配人力不足，需招聘或培训补充"]
      : ["排班覆盖良好，关注公平性持续优化"],
  };
}
